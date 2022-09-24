import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseInterceptors,
  Headers,
  ForbiddenException,
  HttpCode,
  NotFoundException,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiHeaders,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { DocumentsFileUploadRequestDTO, DocVerificationRequestDTO } from "./dto/DocVerificationRequestDTO";
import { IDVerificationRequestDTO } from "./dto/IDVerificationRequestDTO";
import { VerificationResultDTO } from "./dto/VerificationResultDTO";
import { VerificationService } from "./verification.service";
import { Public } from "../auth/public.decorator";
import { VerificationResponseMapper } from "./mappers/VerificationResponseMapper";
import { Consumer } from "../consumer/domain/Consumer";
import { DeviceVerificationResponseDTO } from "./dto/DeviceVerificationResponseDTO";
import { SardineConfigs } from "../../config/configtypes/SardineConfigs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { SARDINE_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import * as crypto_ts from "crypto";
import { DocumentVerificationResultDTO } from "./dto/DocumentVerificationResultDTO";
import { DocumentVerificationWebhookRequestDTO } from "./dto/DocumentVerificationWebhookRequestDTO";
import { CaseNotificationWebhookRequestDTO } from "./dto/CaseNotificationWebhookRequestDTO";
import { WebhookHeadersDTO } from "./dto/WebhookHeadersDTO";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("verify")
@ApiTags("Verification")
@ApiHeaders(getCommonHeaders())
export class VerificationController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly verificationResponseMapper: VerificationResponseMapper;

  constructor(private readonly verificationService: VerificationService) {
    this.verificationResponseMapper = new VerificationResponseMapper();
  }

  @Get("/")
  @ApiOperation({ summary: "Checks if verification service is up" })
  @ApiResponse({ status: HttpStatus.OK, description: "Service is up" })
  async getVerificationStatus(): Promise<string> {
    return "Verification API is functioning"; // TODO: Should ping Sardine
  }

  @Public()
  @Post("/session")
  @ApiOperation({ summary: "Creates a new session for verification" })
  @ApiResponse({ status: HttpStatus.CREATED, type: String, description: "New session token" })
  @ApiBadRequestResponse({ description: "Invalid request" })
  async createSession(): Promise<string> {
    const verificationData = await this.verificationService.createSession();
    return verificationData.props._id;
  }

  @Post("/consumerinfo")
  @ApiOperation({
    summary: "Verifies consumer-provided information",
  })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO, description: "Verification result" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async verifyConsumer(
    @Query("sessionKey") sessionKey: string,
    @Body() requestBody: IDVerificationRequestDTO,
    @Request() request,
  ): Promise<VerificationResultDTO> {
    const consumer: Consumer = request.user.entity;
    const result = await this.verificationService.verifyConsumerInformation(consumer.props._id, sessionKey, {
      ...requestBody,
      userID: consumer.props._id,
      email: consumer.props.email,
    });
    return this.verificationResponseMapper.toConsumerInformationResultDTO(result);
  }

  @Post("/document")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Verifies consumer uploaded identification documents" })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: String,
    description: "Document upload result",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        documentType: {
          type: "string",
          description: "Supported values: passport, national_identity_card, driver_license, other, unknown",
        },
        frontImage: {
          type: "string",
          format: "binary",
        },
        backImage: {
          type: "string",
          format: "binary",
        },
        photoImage: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "frontImage", maxCount: 1 },
      { name: "backImage", maxCount: 1 },
      { name: "photoImage", maxCount: 1 },
    ]),
  )
  async verifyDocument(
    @Query("sessionKey") sessionKey: string,
    @UploadedFiles() files: DocumentsFileUploadRequestDTO,
    @Body() requestData: DocVerificationRequestDTO,
    @Request() request,
  ): Promise<string> {
    const consumer: Consumer = request.user.entity;
    const result = await this.verificationService.verifyDocument(consumer.props._id, sessionKey, {
      userID: consumer.props._id,
      documentType: requestData.documentType,
      documentFrontImage: files.frontImage[0],
      documentBackImage: files.backImage?.length > 0 ? files.backImage[0] : undefined,
      photoImage: files.photoImage?.length > 0 ? files.photoImage[0] : undefined,
    });

    return result;
  }

  @Get("/document/result/:id")
  @ApiOperation({ summary: "Gets result for a previously-submitted document verification" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: DocumentVerificationResultDTO,
    description: "Document verification result",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  @ApiNotFoundResponse({ description: "Document verification request not found" })
  async getDocumentVerificationResult(
    @Param("id") id: string,
    @Request() request,
  ): Promise<DocumentVerificationResultDTO> {
    const consumer: Consumer = request.user.entity;
    if (id !== consumer.props.verificationData.documentVerificationTransactionID) {
      throw new NotFoundException("No verification record is found for the user with the given id");
    }
    const result = await this.verificationService.getDocumentVerificationResult(consumer.props._id, id);
    return this.verificationResponseMapper.toDocumentResultDTO(result);
  }

  @Public()
  @Get("/device/result")
  @ApiOperation({ summary: "Gets device verification result" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: DeviceVerificationResponseDTO,
    description: "Device verification result",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getDeviceVerificationResult(@Query("sessionKey") sessionKey: string): Promise<DeviceVerificationResponseDTO> {
    return await this.verificationService.getDeviceVerificationResult(sessionKey);
  }
}

@Roles(Role.User)
@Controller("verify/webhook")
@ApiTags("VerificationWebhooks")
export class VerificationWebhookController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;
  private readonly sardineConfigs: SardineConfigs;
  private readonly verificationResponseMapper: VerificationResponseMapper;

  constructor(private readonly verificationService: VerificationService, configService: CustomConfigService) {
    this.verificationResponseMapper = new VerificationResponseMapper();
    this.sardineConfigs = configService.get<SardineConfigs>(SARDINE_CONFIG_KEY);
  }

  @Public()
  @Post("/document/result")
  @HttpCode(200)
  async postDocumentVerificationResult(
    @Headers() headers: WebhookHeadersDTO,
    @Body() requestBody: DocumentVerificationWebhookRequestDTO,
    @Request() request: Request,
  ): Promise<DocumentVerificationResultDTO> {
    this.logger.debug(`Received Sardine document verification webhook call: ${JSON.stringify(request.body)}`);

    // Throws an exception if invalid
    this.validateWebhookSignature(headers, request);

    try {
      const result = await this.verificationService.processDocumentVerificationWebhookResult(requestBody);
      return this.verificationResponseMapper.toDocumentResultDTO(result);
    } catch (err) {
      this.logger.error(
        `Error processing Sardine webhook document verification response: request body: ${JSON.stringify(
          request.body,
        )}: error: ${JSON.stringify(err)}`,
      );
      throw err;
    }
  }

  @Public()
  @Post("/case/notification")
  @HttpCode(200)
  async postCaseNotification(
    @Headers() headers: WebhookHeadersDTO,
    @Body() requestBody: CaseNotificationWebhookRequestDTO,
    @Request() request: Request,
  ): Promise<string> {
    this.logger.debug(`Received Sardine case notification webhook call: ${JSON.stringify(request.body)}`);

    // Throws an exception if invalid
    this.validateWebhookSignature(headers, request);

    try {
      await this.verificationService.processKycVerificationWebhookRequest(requestBody);
      return "Successfully received";
    } catch (err) {
      this.logger.error(
        `Error processing Sardine webhook case verification response: request body: ${JSON.stringify(
          request.body,
        )}: error: ${JSON.stringify(err)}`,
      );
      throw err;
    }
  }

  private validateWebhookSignature(headers: WebhookHeadersDTO, request: Request) {
    const sardineSignature = headers["x-sardine-signature"];
    const hmac = crypto_ts.createHmac("sha256", this.sardineConfigs.webhookSecretKey);
    const computedSignature = hmac.update(JSON.stringify(request.body)).digest("hex");
    if (sardineSignature !== computedSignature) {
      this.logger.debug(
        `sardineSignature: ${sardineSignature}, hexString: ${computedSignature}, requestBody: ${JSON.stringify(
          request.body,
        )}`,
      );
      throw new ForbiddenException("Sardine webhook signature does not match");
    }
  }
}
