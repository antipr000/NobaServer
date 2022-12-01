import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { AuthUser } from "../auth/auth.decorator";
import { AuthenticatedUser } from "../auth/domain/AuthenticatedUser";
import { X_NOBA_API_KEY } from "../auth/domain/HeaderConstants";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { PartnerService } from "../partner/partner.service";
import { PlaidClient } from "../psp/plaid.client";
import { ConsumerService } from "./consumer.service";
import { Consumer } from "./domain/Consumer";
import { CryptoWallet } from "./domain/CryptoWallet";
import { WalletStatus } from "./domain/VerificationStatus";
import { AddCryptoWalletDTO, ConfirmWalletUpdateDTO, NotificationMethod } from "./dto/AddCryptoWalletDTO";
import { AddPaymentMethodDTO, PaymentType } from "./dto/AddPaymentMethodDTO";
import { ConsumerDTO } from "./dto/ConsumerDTO";
import { ConsumerHandleDTO } from "./dto/ConsumerHandleDTO";
import { EmailVerificationOtpRequest, UserEmailUpdateRequest } from "./dto/EmailVerificationDTO";
import { PhoneVerificationOtpRequest, UserPhoneUpdateRequest } from "./dto/PhoneVerificationDTO";
import { PlaidTokenDTO } from "./dto/PlaidTokenDTO";
import { UpdateConsumerRequestDTO } from "./dto/UpdateConsumerRequestDTO";
import { UpdatePaymentMethodDTO } from "./dto/UpdatePaymentMethodDTO";
import { ConsumerMapper } from "./mappers/ConsumerMapper";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("consumers")
@ApiTags("Consumer")
@ApiHeaders(getCommonHeaders())
export class ConsumerController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly consumerMapper: ConsumerMapper;

  constructor(
    private readonly consumerService: ConsumerService,
    private readonly partnerService: PartnerService,
    private readonly plaidClient: PlaidClient,
  ) {
    this.consumerMapper = new ConsumerMapper();
  }

  @Get("/")
  @ApiOperation({ summary: "Gets details of logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Details of logged-in consumer",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getConsumer(@Headers() headers, @Request() request): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }
    const partner = await this.partnerService.getPartnerFromApiKey(headers[X_NOBA_API_KEY]);

    const consumerID: string = consumer.props._id;
    const entity: Consumer = await this.consumerService.getConsumer(consumerID);

    if (!partner.props.config.viewOtherWallets) {
      entity.props.cryptoWallets = entity.props.cryptoWallets.filter(wallet => {
        return wallet.partnerID === partner.props._id;
      });
    }
    entity.props.cryptoWallets = entity.props.cryptoWallets.filter(wallet => {
      return wallet.partnerID === partner.props._id || wallet.isPrivate === false;
    });
    return this.consumerMapper.toDTO(entity);
  }

  @Get("/handles/availability")
  @ApiOperation({ summary: "Returns whether the handle is available or not." })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerHandleDTO,
    description: "False or True specifying whether the specified 'handle' is already in use or not",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async isHandleAvailable(@Query("handle") handle: string, @Request() request): Promise<ConsumerHandleDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    return {
      isAvailable: await this.consumerService.isHandleAvailable(handle.toLocaleLowerCase()),
      handle: handle.toLocaleLowerCase(),
    };
  }

  @Patch("/")
  @ApiOperation({ summary: "Updates details of logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Updated consumer record",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async updateConsumer(@Request() request, @Body() requestBody: UpdateConsumerRequestDTO): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const consumerProps = {
      ...consumer.props,
      ...requestBody,
    };
    const res = await this.consumerService.updateConsumer(consumerProps);
    return this.consumerMapper.toDTO(res);
  }

  @Patch("/phone")
  @ApiOperation({ summary: "Adds or updates phone number of logged in user with OTP" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Updated the user's phone number",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async updatePhone(@Request() request, @Body() requestBody: UserPhoneUpdateRequest): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const existingConsumer = await this.consumerService.findConsumerByEmailOrPhone(requestBody.phone);
    if (existingConsumer.isSuccess) {
      // Somebody else already has this phone number, so deny update
      throw new BadRequestException("User already exists with this phone number");
    }

    const res = await this.consumerService.updateConsumerPhone(consumer, requestBody, request.user.partnerId);
    return this.consumerMapper.toDTO(res);
  }

  @Post("/phone/verify")
  @ApiOperation({ summary: "Sends OTP to user's phone to verify update of user profile" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "OTP sent to user's phone",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async requestOtpToUpdatePhone(@Request() request, @Body() requestBody: PhoneVerificationOtpRequest) {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const existingConsumer = await this.consumerService.findConsumerByEmailOrPhone(requestBody.phone);
    if (existingConsumer.isSuccess) {
      // Somebody else already has this phone number, so deny update
      throw new BadRequestException("User already exists with this phone number");
    }

    await this.consumerService.sendOtpToPhone(consumer.props._id, requestBody.phone, request.user.partnerId);
  }

  @Patch("/email")
  @ApiOperation({ summary: "Adds or updates email address of logged in user with OTP" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Updated the user's email address",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async updateEmail(@Request() request, @Body() requestBody: UserEmailUpdateRequest): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const existingConsumer = await this.consumerService.findConsumerByEmailOrPhone(requestBody.email);
    if (existingConsumer.isSuccess) {
      // Somebody else already has this email number, so deny update
      throw new BadRequestException("User already exists with this email address");
    }

    const res = await this.consumerService.updateConsumerEmail(consumer, requestBody);
    return this.consumerMapper.toDTO(res);
  }

  @Post("/email/verify")
  @ApiOperation({ summary: "Sends OTP to user's email to verify update of user profile" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "OTP sent to user's email address",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async requestOtpToUpdateEmail(
    @Request() request,
    @Headers() headers,
    @Body() requestBody: EmailVerificationOtpRequest,
  ) {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const existingConsumer = await this.consumerService.findConsumerByEmailOrPhone(requestBody.email);
    if (existingConsumer.isSuccess) {
      // Somebody else already has this email number, so deny update
      throw new BadRequestException("User already exists with this email address");
    }

    const partnerID = (await this.partnerService.getPartnerFromApiKey(headers[X_NOBA_API_KEY])).props._id;

    await this.consumerService.sendOtpToEmail(requestBody.email, consumer, partnerID);
  }

  @Get("/paymentmethods/plaid/token")
  @ApiOperation({ summary: "Generates a token to connect to Plaid UI" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PlaidTokenDTO,
    description: "Plaid token",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async generatePlaidToken(@Request() request): Promise<PlaidTokenDTO> {
    const user: AuthenticatedUser = request.user;
    const consumer = user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    return {
      token: await this.plaidClient.generateLinkToken({ userID: consumer.props._id }),
    };
  }

  @Post("/paymentmethods")
  @ApiOperation({ summary: "Adds a payment method for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: ConsumerDTO,
    description: "Updated consumer record",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid payment method details" })
  async addPaymentMethod(@Body() requestBody: AddPaymentMethodDTO, @Request() request): Promise<ConsumerDTO> {
    const user: AuthenticatedUser = request.user;
    const consumer = user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const requiredFields = [];
    switch (requestBody.type) {
      case PaymentType.CARD:
        requiredFields.push("cardDetails");
        break;

      case PaymentType.ACH:
        requiredFields.push("achDetails");
        break;

      default:
        throw new BadRequestException(`"type" should be one of "${PaymentType.CARD}" or "${PaymentType.ACH}".`);
    }
    requiredFields.forEach(field => {
      if (requestBody[field] === undefined || requestBody[field] === null) {
        throw new BadRequestException(`"${field}" is required field when "type" is "${requestBody.type}".`);
      }
    });

    const res = await this.consumerService.addPaymentMethod(consumer, requestBody, user.partnerId);
    return this.consumerMapper.toDTO(res);
  }

  @Patch("/paymentmethods/:paymentToken")
  @ApiOperation({ summary: "Updates a payment method for logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Consumer record with updated payment methods",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid payment method details" })
  @ApiNotFoundResponse({ description: "Payment method not found for Consumer" })
  async updatePaymentMethod(
    @Param("paymentToken") paymentToken: string,
    @AuthUser() consumer: Consumer,
    @Body() updatePaymentMethodDTO: UpdatePaymentMethodDTO,
  ): Promise<ConsumerDTO> {
    const paymentMethod = consumer.getPaymentMethodByID(paymentToken);

    if (paymentMethod === null) {
      throw new NotFoundException("Payment method not found for consumer");
    }

    if (updatePaymentMethodDTO.name) paymentMethod.name = updatePaymentMethodDTO.name;
    if (updatePaymentMethodDTO.isDefault) paymentMethod.isDefault = updatePaymentMethodDTO.isDefault;
    const res = await this.consumerService.updatePaymentMethod(consumer.props._id, paymentMethod);
    return this.consumerMapper.toDTO(res);
  }

  @Delete("/paymentmethods/:paymentToken")
  @ApiOperation({ summary: "Deletes a payment method for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Consumer record with updated payment methods",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid payment method details" })
  async deletePaymentMethod(@Param("paymentToken") paymentToken: string, @Request() request): Promise<ConsumerDTO> {
    const user: AuthenticatedUser = request.user;
    const consumer = user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }
    const res = await this.consumerService.removePaymentMethod(consumer, paymentToken, user.partnerId);
    return this.consumerMapper.toDTO(res);
  }

  /* Example of how we can decrypt the SSN. This should only be available to the compliance team.
  @Get("/ssn")
  @ApiOperation({ summary: "Gets SSN of currently logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Get SSN of currently logged-in consumer",
  })
  async getConsumerSSN(@Request() request): Promise<string> {
    const consumerID: string = request.consumer.props._id;
    const consumer = await this.consumerService.getConsumer(consumerID);
    const decrypted = await new KMSUtil("ssn-encryption-key").decryptString(consumer.props.socialSecurityNumber);
    return decrypted;
  }*/

  @Post("/wallets")
  @ApiOperation({ summary: "Adds a crypto wallet for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: ConsumerDTO,
    description: "Updated consumer record with the crypto wallet",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid crypto wallet details" })
  async addCryptoWallet(@Body() requestBody: AddCryptoWalletDTO, @Headers() headers, @Request() request): Promise<any> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    // Sanitize notification method for OTP
    const notificationMethod = this.verifyOrReplaceNotificationMethod(requestBody.notificationMethod, consumer);

    // Initialise the crypto wallet object with a pending status here in case any updates made to wallet or addition of a new wallet
    const cryptoWallet: CryptoWallet = {
      walletName: requestBody.walletName,
      address: requestBody.address,
      chainType: requestBody.chainType,
      isEVMCompatible: requestBody.isEVMCompatible,
      status: WalletStatus.PENDING,
      partnerID: request.user.partnerId,
      isPrivate: true, // default value of 'isPrivate'.
    };

    // Ignore the response from the below method, as we don't return the updated consumer in this API.
    await this.consumerService.addOrUpdateCryptoWallet(consumer, cryptoWallet, notificationMethod);
    return { notificationMethod: notificationMethod };
  }

  @Delete("/wallets/:walletAddress")
  @ApiOperation({ summary: "Deletes a saved wallet for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Deleted wallet for consumer",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid wallet address" })
  async deleteCryptoWallet(@Param("walletAddress") walletAddress: string, @Request() request): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const partner = await this.partnerService.getPartnerFromApiKey(request.headers[X_NOBA_API_KEY]);
    const res = await this.consumerService.removeCryptoWallet(consumer, walletAddress, partner.props._id);
    return this.consumerMapper.toDTO(res);
  }

  @Post("/wallets/confirm")
  @ApiOperation({ summary: "Submits the one-time passcode (OTP) to confirm wallet add or update" })
  @ApiResponse({ status: HttpStatus.OK, type: ConsumerDTO, description: "Verified wallet for consumer" })
  @ApiUnauthorizedResponse({ description: "Invalid OTP" })
  async confirmWalletUpdate(
    @Headers() headers,
    @Body() requestBody: ConfirmWalletUpdateDTO,
    @Request() request,
  ): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException("Endpoint can only be called by consumers");
    }

    const partner = await this.partnerService.getPartnerFromApiKey(headers[X_NOBA_API_KEY]);

    const notificationMethod = this.verifyOrReplaceNotificationMethod(requestBody.notificationMethod, consumer);

    const res = await this.consumerService.confirmWalletUpdateOTP(
      consumer,
      requestBody.address,
      requestBody.otp,
      consumer.props._id,
      partner.props._id,
      notificationMethod,
    );
    return this.consumerMapper.toDTO(res);
  }

  private verifyOrReplaceNotificationMethod(
    notificationMethod: NotificationMethod,
    consumer: Consumer,
  ): NotificationMethod {
    if (notificationMethod === NotificationMethod.EMAIL && !consumer.props.email) {
      if (!consumer.props.phone) {
        throw new BadRequestException("No email or phone configured for consumer");
      }
      this.logger.warn("Email not configured for consumer, using phone instead");
      notificationMethod = NotificationMethod.PHONE;
    }
    if (notificationMethod === NotificationMethod.PHONE && !consumer.props.phone) {
      if (!consumer.props.email) {
        throw new BadRequestException("No email or phone configured for consumer");
      }
      this.logger.warn("Phone not configured for consumer, using email instead");
      notificationMethod = NotificationMethod.EMAIL;
    }
    return notificationMethod;
  }
}
