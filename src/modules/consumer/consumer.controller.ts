import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { ConsumerService } from "./consumer.service";
import { Consumer, ConsumerProps } from "./domain/Consumer";
import { CryptoWallet } from "./domain/CryptoWallet";
import { AddCryptoWalletDTO, ConfirmWalletUpdateDTO, NotificationMethod } from "./dto/AddCryptoWalletDTO";
import { ConsumerDTO } from "./dto/ConsumerDTO";
import { ConsumerHandleDTO } from "./dto/ConsumerHandleDTO";
import { EmailVerificationOtpRequest, UserEmailUpdateRequest } from "./dto/EmailVerificationDTO";
import { PhoneVerificationOtpRequest, UserPhoneUpdateRequest } from "./dto/PhoneVerificationDTO";
import { UpdateConsumerRequestDTO } from "./dto/UpdateConsumerRequestDTO";
import { UpdatePaymentMethodDTO } from "./dto/UpdatePaymentMethodDTO";
import { ConsumerMapper } from "./mappers/ConsumerMapper";
import { PaymentMethod, PaymentMethodProps } from "./domain/PaymentMethod";
import { WalletStatus } from "@prisma/client";
import { AddCryptoWalletResponseDTO } from "./dto/AddCryptoWalletResponse";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { QRCodeDTO } from "./dto/QRCodeDTO";
import { ContactConsumerRequestDTO } from "./dto/ContactConsumerRequestDTO";
import { ContactConsumerResponseDTO } from "./dto/ContactConsumerResponseDTO";
import { RegisterWithEmployerDTO } from "./dto/RegisterWithEmployerDTO";
import { LinkedEmployerDTO } from "./dto/LinkedEmployerDTO";
import { Employee } from "../employee/domain/Employee";
import { UpdateEmployerAllocationDTO } from "./dto/UpdateEmployerAllocationDTO";
import { OptionalLimitQueryDTO } from "../common/dto/OptionalLimitQueryDTO";
import { RequestEmployerDTO } from "./dto/RequestEmployerDTO";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";
import { IdentificationDTO } from "./dto/identification.dto";
import { CreateIdentificationDTO } from "./dto/create.identification.dto";
import { UpdateIdentificationDTO } from "./dto/update.identification.dto";

@Roles(Role.CONSUMER)
@ApiBearerAuth("JWT-auth")
@Controller("v1/consumers")
@ApiTags("Consumer")
@ApiHeaders(getCommonHeaders())
export class ConsumerController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(private readonly consumerService: ConsumerService, private readonly consumerMapper: ConsumerMapper) {}

  @Get("/")
  @ApiOperation({ summary: "Gets details of logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Details of logged-in consumer",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getConsumer(@AuthUser() consumer: Consumer): Promise<ConsumerDTO> {
    const consumerID: string = consumer.props.id;
    const entity: Consumer = await this.consumerService.getConsumer(consumerID);

    if (!entity) {
      throw new NotFoundException("Requested user details not found");
    }
    return await this.mapToDTO(entity);
  }

  @Get("/handles/availability")
  @ApiOperation({ summary: "Returns whether the handle is available or not." })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerHandleDTO,
    description: "False or True specifying whether the specified 'handle' is already in use or not",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async isHandleAvailable(@Query("handle") handle: string, @AuthUser() consumer: Consumer): Promise<ConsumerHandleDTO> {
    if (!handle) {
      return {
        isAvailable: false,
        handle: handle,
      };
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
  async updateConsumer(
    @AuthUser() consumer: Consumer,
    @Body() requestBody: UpdateConsumerRequestDTO,
  ): Promise<ConsumerDTO> {
    try {
      let referredByID: string;
      if (requestBody.referredByCode) {
        referredByID = await this.consumerService.findConsumerIDByReferralCode(requestBody.referredByCode);
        if (referredByID === null) {
          this.logger.error("Unable to find user with referral code: " + requestBody.referredByCode);
        }
      }
      const consumerProps: Partial<ConsumerProps> = {
        id: consumer.props.id,
        ...(requestBody.firstName && { firstName: requestBody.firstName }),
        ...(requestBody.lastName && { lastName: requestBody.lastName }),
        ...(requestBody.locale && { locale: requestBody.locale }),
        ...(requestBody.gender && { gender: requestBody.gender }),
        ...(requestBody.address && {
          address: {
            ...(requestBody.address.streetLine1 && { streetLine1: requestBody.address.streetLine1 }),
            ...(requestBody.address.streetLine2 && { streetLine2: requestBody.address.streetLine2 }),
            ...(requestBody.address.city && { city: requestBody.address.city }),
            ...(requestBody.address.countryCode && { countryCode: requestBody.address.countryCode }),
            ...(requestBody.address.regionCode && { regionCode: requestBody.address.regionCode }),
            ...(requestBody.address.postalCode && { postalCode: requestBody.address.postalCode }),
          },
        }),
        ...(requestBody.dateOfBirth && { dateOfBirth: requestBody.dateOfBirth }),
        ...(requestBody.handle && { handle: requestBody.handle }),
        ...(requestBody.isDisabled && { isDisabled: requestBody.isDisabled }),
        ...(referredByID && { referredByID: referredByID }),
      };
      const res = await this.consumerService.updateConsumer(consumerProps);
      return await this.mapToDTO(res);
    } catch (e) {
      if (e instanceof BadRequestError) {
        throw new BadRequestException(e.message);
      } /* This may be ideal, but it would break the app. We can consider changing this when we have a better way to handle errors in the app.
      else if (e instanceof ServiceException) {
        throw e;
      } */ else {
        this.logger.error(`Error updating consumer record: ${JSON.stringify(e)}`);
        throw new BadRequestException("Failed to update requested details");
      }
    }
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
  async updatePhone(@AuthUser() consumer: Consumer, @Body() requestBody: UserPhoneUpdateRequest): Promise<ConsumerDTO> {
    const res = await this.consumerService.updateConsumerPhone(consumer, requestBody);
    return await this.mapToDTO(res);
  }

  @Post("/phone/verify")
  @ApiOperation({ summary: "Sends OTP to user's phone to verify update of user profile" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "OTP sent to user's phone",
    type: BlankResponseDTO,
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async requestOtpToUpdatePhone(
    @AuthUser() consumer: Consumer,
    @Body() requestBody: PhoneVerificationOtpRequest,
  ): Promise<BlankResponseDTO> {
    const existingConsumer = await this.consumerService.findConsumerByEmailOrPhone(requestBody.phone);
    if (existingConsumer.isSuccess) {
      // Somebody else already has this phone number, so deny update
      throw new BadRequestException("User already exists with this phone number");
    }

    await this.consumerService.sendOtpToPhone(consumer.props.id, requestBody.phone);
    return {};
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
  async updateEmail(@AuthUser() consumer: Consumer, @Body() requestBody: UserEmailUpdateRequest): Promise<ConsumerDTO> {
    const res = await this.consumerService.updateConsumerEmail(consumer, requestBody);
    return await this.mapToDTO(res);
  }

  @Post("/email/verify")
  @ApiOperation({ summary: "Sends OTP to user's email to verify update of user profile" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "OTP sent to user's email address",
    type: BlankResponseDTO,
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async requestOtpToUpdateEmail(
    @AuthUser() consumer: Consumer,
    @Body() requestBody: EmailVerificationOtpRequest,
  ): Promise<BlankResponseDTO> {
    const existingConsumer = await this.consumerService.findConsumerByEmailOrPhone(requestBody.email);
    if (existingConsumer.isSuccess) {
      // Somebody else already has this email number, so deny update
      throw new BadRequestException("User already exists with this email address");
    }
    await this.consumerService.sendOtpToEmail(requestBody.email, consumer);
    return {};
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
    const paymentMethodProps: Partial<PaymentMethodProps> = {};

    if (updatePaymentMethodDTO.name) paymentMethodProps.name = updatePaymentMethodDTO.name;
    if (updatePaymentMethodDTO.isDefault) paymentMethodProps.isDefault = updatePaymentMethodDTO.isDefault;
    await this.consumerService.updatePaymentMethod(consumer.props.id, paymentMethodProps);
    return this.mapToDTO(consumer);
  }

  @Post("/devicecontacts")
  @ApiOperation({ summary: "Bulk query contact consumers" })
  @ApiBody({
    type: [ContactConsumerRequestDTO],
    description: "List of contact consumer details",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [ContactConsumerResponseDTO],
    description: "List of consumers that are contacts",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid contact consumer details" })
  async getConsumersByContact(
    @Body() requestBody: ContactConsumerRequestDTO[],
    @AuthUser() consumer: Consumer,
  ): Promise<ContactConsumerResponseDTO[]> {
    const consumers = await this.consumerService.findConsumersByContactInfo(requestBody);

    const response = consumers.map((consumer, i) => {
      if (!consumer) {
        return {
          consumerID: null,
          handle: null,
          firstName: null,
          lastName: null,
        };
      }

      return {
        consumerID: consumer.props.id,
        handle: consumer.props.handle,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
      };
    });

    return response;
  }

  @Get("/search")
  @ApiOperation({ summary: "Search for consumers based on public information." })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [ContactConsumerResponseDTO],
    description: "List of consumers that match the search criteria",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async searchConsumers(
    @Query("query") query: string,
    @Query("") limitDTO: OptionalLimitQueryDTO,
    @AuthUser() consumer: Consumer,
  ): Promise<ContactConsumerResponseDTO[]> {
    const consumers = await this.consumerService.findConsumersByPublicInfo(query, limitDTO.limit || 10);
    return consumers.map(consumer => {
      return {
        consumerID: consumer.props.id,
        handle: consumer.props.handle,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
      };
    });
  }

  @Post("/subscribe/push/:pushToken")
  @ApiOperation({ summary: "Subscribe to push notifications" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Successfully subscribed to push notifications",
    type: BlankResponseDTO,
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid push notification details" })
  async subscribeToPushNotifications(
    @Param("pushToken") pushToken: string,
    @AuthUser() consumer: Consumer,
  ): Promise<BlankResponseDTO> {
    await this.consumerService.subscribeToPushNotifications(consumer.props.id, pushToken);
    return {};
  }

  @Post("/unsubscribe/push/:pushToken")
  @ApiOperation({ summary: "Unsubscribe from push notifications" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Successfully unsubscribed from push notifications",
    type: BlankResponseDTO,
  })
  async unsubscribeFromPushNotifications(
    @Param("pushToken") pushToken: string,
    @AuthUser() consumer: Consumer,
  ): Promise<BlankResponseDTO> {
    await this.consumerService.unsubscribeFromPushNotifications(consumer.props.id, pushToken);
    return {};
  }

  @Post("/wallets")
  @ApiOperation({ summary: "Adds a crypto wallet for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AddCryptoWalletResponseDTO,
    description: "Notficiation type and created wallet id",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid crypto wallet details" })
  async addCryptoWallet(
    @Body() requestBody: AddCryptoWalletDTO,
    @AuthUser() consumer: Consumer,
  ): Promise<AddCryptoWalletResponseDTO> {
    // Sanitize notification method for OTP
    const notificationMethod = this.verifyOrReplaceNotificationMethod(requestBody.notificationMethod, consumer);

    // Initialise the crypto wallet object with a pending status here in case any updates made to wallet or addition of a new wallet
    const cryptoWallet = CryptoWallet.createCryptoWallet({
      name: requestBody.walletName,
      address: requestBody.address,
      chainType: requestBody.chainType,
      isEVMCompatible: requestBody.isEVMCompatible,
      status: WalletStatus.PENDING,
      consumerID: consumer.props.id,
    });

    try {
      // // Ignore the response from the below method, as we don't return the updated consumer in this API.
      const addedWallet = await this.consumerService.addOrUpdateCryptoWallet(
        consumer,
        cryptoWallet,
        notificationMethod,
      );
      return { notificationMethod: notificationMethod, walletID: addedWallet.props.id };
    } catch (e) {
      if (e instanceof BadRequestError) {
        throw new BadRequestException(e.message);
      } else {
        throw new BadRequestException("Failed to add wallet for consumer");
      }
    }
  }

  @Delete("/wallets/:walletID")
  @ApiOperation({ summary: "Deletes a saved wallet for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Deleted wallet for consumer",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid wallet address" })
  async deleteCryptoWallet(@Param("walletID") walletID: string, @AuthUser() consumer: Consumer): Promise<ConsumerDTO> {
    await this.consumerService.removeCryptoWallet(consumer, walletID);
    return this.mapToDTO(consumer);
  }

  @Post("/wallets/confirm")
  @ApiOperation({ summary: "Submits the one-time passcode (OTP) to confirm wallet add or update" })
  @ApiResponse({ status: HttpStatus.OK, type: ConsumerDTO, description: "Verified wallet for consumer" })
  @ApiUnauthorizedResponse({ description: "Invalid OTP" })
  async confirmWalletUpdate(
    @Headers() headers,
    @Body() requestBody: ConfirmWalletUpdateDTO,
    @AuthUser() consumer: Consumer,
  ): Promise<ConsumerDTO> {
    const notificationMethod = this.verifyOrReplaceNotificationMethod(requestBody.notificationMethod, consumer);

    await this.consumerService.confirmWalletUpdateOTP(
      consumer,
      requestBody.walletID,
      requestBody.otp,
      notificationMethod,
    );
    return this.mapToDTO(consumer);
  }

  @Post("/employers")
  @ApiOperation({ summary: "Links the consumer with an Employer" })
  @ApiResponse({ status: HttpStatus.OK, description: "Registered Employee record", type: BlankResponseDTO })
  async registerWithAnEmployer(
    @Body() requestBody: RegisterWithEmployerDTO,
    @AuthUser() consumer: Consumer,
  ): Promise<BlankResponseDTO> {
    await this.consumerService.registerWithAnEmployer(
      requestBody.employerID,
      consumer.props.id,
      requestBody.allocationAmountInPesos,
    );
    return {};
  }

  @Get("/employers")
  @ApiOperation({ summary: "Lists all the Employers the current Consumer is associated with" })
  @ApiResponse({ status: HttpStatus.OK, type: [LinkedEmployerDTO] })
  async listLinkedEmployers(@AuthUser() consumer: Consumer): Promise<LinkedEmployerDTO[]> {
    const employees: Employee[] = await this.consumerService.listLinkedEmployers(consumer.props.id);
    return this.consumerMapper.toLinkedEmployerArrayDTO(employees);
  }

  @Patch("/employers")
  @ApiOperation({ summary: "Updates the allocation amount for a specific employer" })
  @ApiResponse({ status: HttpStatus.OK, type: LinkedEmployerDTO })
  async updateAllocationAmountForAnEmployer(
    @AuthUser() consumer: Consumer,
    @Body() requestBody: UpdateEmployerAllocationDTO,
  ): Promise<BlankResponseDTO> {
    const employee = await this.consumerService.updateEmployerAllocationAmount(
      requestBody.employerID,
      consumer.props.id,
      requestBody.allocationAmountInPesos,
    );
    return this.consumerMapper.toLinkedEmployerDTO(employee.id);
  }

  @Post("/employers/request")
  @ApiOperation({ summary: "Request employer to join Noba" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Email Sent",
    type: BlankResponseDTO,
  })
  async postEmployerRequestEmail(
    @Body() requestBody: RequestEmployerDTO,
    @AuthUser() consumer: Consumer,
  ): Promise<BlankResponseDTO> {
    // Use consumer's locale to drive the language of the request email
    await this.consumerService.sendEmployerRequestEmail(
      requestBody.email,
      consumer.props.locale,
      consumer.props.firstName,
      consumer.props.lastName,
    );
    return {};
  }

  @Get("/qrcode")
  @ApiOperation({ summary: "Gets QR code for the logged-in consumer" })
  @ApiResponse({ status: HttpStatus.OK, description: "Base64 of QR code for the logged-in consumer", type: QRCodeDTO })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async getQRCode(@AuthUser() consumer: Consumer, @Query("url") url: string): Promise<QRCodeDTO> {
    return {
      base64OfImage: await this.consumerService.getBase64EncodedQRCode(url),
    };
  }

  @Post("/identifications")
  @ApiOperation({ summary: "Adds an identification document for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Added identification document for consumer",
    type: IdentificationDTO,
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid identification document" })
  async addIdentification(@AuthUser() consumer: Consumer, @Body() requestBody: CreateIdentificationDTO) {
    const identification = await this.consumerService.addIdentification(consumer.props.id, requestBody);
    return {}; // return empty response for now
  }

  @Get("/identifications/:identificationID")
  @ApiOperation({ summary: "Gets an identification document for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Added identification document for consumer",
    type: IdentificationDTO,
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid identification document" })
  async getIdentification(
    @AuthUser() consumer: Consumer,
    @Param("identificationID") identificationID: string,
  ): Promise<IdentificationDTO> {
    const identification = await this.consumerService.getIdentificationForConsumer(consumer.props.id, identificationID);
    return ConsumerMapper.toIdentificationDTO(identification);
  }

  @Get("/identifications")
  @ApiOperation({ summary: "Lists all identification documents for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of identification documents for consumer",
    type: [IdentificationDTO],
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async listIdentifications(@AuthUser() consumer: Consumer): Promise<IdentificationDTO[]> {
    const identifications = await this.consumerService.getAllIdentifications(consumer.props.id);
    return ConsumerMapper.toIdentificationsDTO(identifications);
  }

  @Delete("/identifications/:identificationID")
  @ApiOperation({ summary: "Deletes an identification document for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Deleted identification document for consumer",
    type: IdentificationDTO,
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid identification document" })
  async deleteIdentification(@AuthUser() consumer: Consumer, @Param("identificationID") identificationID: string) {
    const identification = await this.consumerService.deleteIdentification(consumer.props.id, identificationID);
    return {}; // return empty response for now
  }

  @Patch("/identifications/:identificationID")
  @ApiOperation({ summary: "Updates an identification document for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Updated identification document for consumer",
    type: IdentificationDTO,
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid identification document" })
  async updateIdentification(
    @AuthUser() consumer: Consumer,
    @Param("identificationID") identificationID: string,
    @Body() requestBody: UpdateIdentificationDTO,
  ) {
    const identification = await this.consumerService.updateIdentification(
      consumer.props.id,
      identificationID,
      requestBody,
    );
    return {}; // return empty response for now
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

  private async mapToDTO(consumer: Consumer): Promise<ConsumerDTO> {
    const allPaymentMethods: PaymentMethod[] = await this.consumerService.getAllPaymentMethodsForConsumer(
      consumer.props.id,
    );

    const allCryptoWallets: CryptoWallet[] = await this.consumerService.getAllConsumerWallets(consumer.props.id);

    return this.consumerMapper.toDTO(consumer, allPaymentMethods, allCryptoWallets);
  }
}
