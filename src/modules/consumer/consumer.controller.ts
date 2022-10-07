import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Request,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { ConsumerService } from "./consumer.service";
import { Consumer } from "./domain/Consumer";
import { CryptoWallet } from "./domain/CryptoWallet";
import { WalletStatus } from "./domain/VerificationStatus";
import { AddCryptoWalletDTO, ConfirmWalletUpdateDTO } from "./dto/AddCryptoWalletDTO";
import { AddPaymentMethodDTO } from "./dto/AddPaymentMethodDTO";
import { ConsumerDTO } from "./dto/ConsumerDTO";
import { UpdateConsumerRequestDTO } from "./dto/UpdateConsumerRequestDTO";
import { ConsumerMapper } from "./mappers/ConsumerMapper";
import { PartnerService } from "../partner/partner.service";
import { X_NOBA_API_KEY } from "../auth/domain/HeaderConstants";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("consumers")
@ApiTags("Consumer")
@ApiHeaders(getCommonHeaders())
export class ConsumerController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly consumerMapper: ConsumerMapper;

  constructor(private readonly consumerService: ConsumerService, private readonly partnerService: PartnerService) {
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
      throw new ForbiddenException();
    }
    const partner = await this.partnerService.getPartnerFromApiKey(headers[X_NOBA_API_KEY.toLowerCase()]);

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
      throw new ForbiddenException();
    }

    const consumerProps = {
      ...consumer.props,
      ...requestBody,
    };
    const res = await this.consumerService.updateConsumer(consumerProps);
    return this.consumerMapper.toDTO(res);
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
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException();
    }

    const res = await this.consumerService.addPaymentMethod(consumer, requestBody);
    return this.consumerMapper.toDTO(res);
  }

  @Delete("/paymentmethods/:paymentToken")
  @ApiOperation({ summary: "Deletes a payment method for the logged-in consumer" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConsumerDTO,
    description: "Deleted consumer record",
  })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  @ApiBadRequestResponse({ description: "Invalid payment method details" })
  async deletePaymentMethod(@Param("paymentToken") paymentToken: string, @Request() request): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException();
    }

    const res = await this.consumerService.removePaymentMethod(consumer, paymentToken);
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
  async addCryptoWallet(
    @Body() requestBody: AddCryptoWalletDTO,
    @Headers() headers,
    @Request() request,
  ): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException();
    }

    // Initialise the crypto wallet object with a pending status here in case of any updates made to wallet OR addition of a new wallet
    const cryptoWallet: CryptoWallet = {
      walletName: requestBody.walletName,
      address: requestBody.address,
      chainType: requestBody.chainType,
      isEVMCompatible: requestBody.isEVMCompatible,
      status: WalletStatus.PENDING,
      partnerID: request.user.partnerId,
    } as any;

    const res = await this.consumerService.addOrUpdateCryptoWallet(consumer, cryptoWallet);
    return this.consumerMapper.toDTO(res);
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
      throw new ForbiddenException();
    }

    const res = await this.consumerService.removeCryptoWallet(consumer, walletAddress);
    return this.consumerMapper.toDTO(res);
  }

  @Post("/wallets/confirm")
  @ApiOperation({ summary: "Submits the one-time passcode (OTP) to confirm wallet add or update" })
  @ApiResponse({ status: HttpStatus.OK, type: ConsumerDTO, description: "Verified wallet for consumer" })
  @ApiUnauthorizedResponse({ description: "Invalid OTP" })
  async confirmWalletUpdate(@Body() requestBody: ConfirmWalletUpdateDTO, @Request() request): Promise<ConsumerDTO> {
    const consumer = request.user.entity;
    if (!(consumer instanceof Consumer)) {
      throw new ForbiddenException();
    }

    const res = await this.consumerService.confirmWalletUpdateOTP(consumer, requestBody.address, requestBody.otp);
    return this.consumerMapper.toDTO(res);
  }
}
