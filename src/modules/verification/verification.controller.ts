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
  ApiQuery,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { DocumentsFileUploadRequestDTO, DocVerificationRequestDTO } from "./dto/DocVerificationRequestDTO";
import { VerificationResultDTO } from "./dto/VerificationResultDTO";
import { VerificationService } from "./verification.service";
import { IsNoApiKeyNeeded, Public } from "../auth/public.decorator";
import { VerificationResponseMapper } from "./mappers/VerificationResponseMapper";
import { Consumer } from "../consumer/domain/Consumer";
import { DeviceVerificationResponseDTO } from "./dto/DeviceVerificationResponseDTO";
import { SardineConfigs } from "../../config/configtypes/SardineConfigs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { SARDINE_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import crypto_ts from "crypto";
import { DocumentVerificationResultDTO } from "./dto/DocumentVerificationResultDTO";
import { DocumentVerificationWebhookRequestDTO } from "./dto/DocumentVerificationWebhookRequestDTO";
import { CaseNotificationWebhookRequestDTO } from "./dto/CaseNotificationWebhookRequestDTO";
import { WebhookHeadersDTO } from "./dto/WebhookHeadersDTO";
import { IDVerificationURLResponseDTO, IDVerificationURLRequestLocale } from "./dto/IDVerificationRequestURLDTO";
import { AuthUser } from "../auth/auth.decorator";
import { SessionResponseDTO } from "./dto/SessionResponseDTO";
import { DocumentVerificationResponseDTO } from "./dto/DocumentVerificationResponseDTO";
import { AlertService } from "../common/alerts/alert.service";

@Roles(Role.CONSUMER)
@ApiBearerAuth("JWT-auth")
@Controller("v1/verify")
@ApiTags("Verification")
@ApiHeaders(getCommonHeaders())
export class VerificationController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly verificationResponseMapper: VerificationResponseMapper;

  constructor(private readonly verificationService: VerificationService) {
    this.verificationResponseMapper = new VerificationResponseMapper();
  }

  @Public()
  @Post("/session")
  @ApiOperation({ summary: "Creates a new session for verification" })
  @ApiResponse({ status: HttpStatus.CREATED, type: SessionResponseDTO, description: "New session token" })
  @ApiBadRequestResponse({ description: "Invalid request" })
  async createSession(): Promise<SessionResponseDTO> {
    const verificationData = await this.verificationService.createSession();
    return {
      sessionToken: verificationData.props.id,
    };
  }

  @Post("/consumer")
  @ApiOperation({
    summary: "Verifies consumer-provided information",
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO, description: "Verification result" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async verifyConsumer(
    @Query("sessionKey") sessionKey: string,
    @AuthUser() consumer: Consumer,
  ): Promise<VerificationResultDTO> {
    const status = await this.verificationService.verifyConsumerInformation(consumer.props.id, sessionKey);
    return this.verificationResponseMapper.toConsumerInformationResultDTO(status);
  }

  @Post("/document")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Verifies consumer uploaded identification documents" })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: DocumentVerificationResponseDTO,
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
    @AuthUser() consumer: Consumer,
  ): Promise<DocumentVerificationResponseDTO> {
    const result = await this.verificationService.verifyDocument(consumer.props.id, sessionKey, {
      userID: consumer.props.id,
      documentType: requestData.documentType,
      documentFrontImage: files.frontImage[0],
      documentBackImage: files.backImage?.length > 0 ? files.backImage[0] : undefined,
      photoImage: files.photoImage?.length > 0 ? files.photoImage[0] : undefined,
    });

    return {
      documentCheckReference: result,
    };
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
    @AuthUser() consumer: Consumer,
  ): Promise<DocumentVerificationResultDTO> {
    if (id !== consumer.props.verificationData.documentCheckReference) {
      throw new NotFoundException("No verification record is found for the user with the given id");
    }
    const status = await this.verificationService.getDocumentVerificationResult(consumer.props.id, id);
    return this.verificationResponseMapper.toDocumentResultDTO(status);
  }

  @Get("/document/url")
  @ApiOperation({ summary: "Retrieves a URL for identity verification" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IDVerificationURLResponseDTO,
    description: "Document verification KYC URL details",
  })
  @ApiQuery({ name: "sessionKey", description: "Unique verification key for this session" })
  @ApiQuery({
    name: "locale",
    enum: IDVerificationURLRequestLocale,
    description: "Unique verification key for this session",
  })
  @ApiQuery({ name: "requestBack", type: "boolean", description: "Request photo of back of ID" })
  @ApiQuery({ name: "requestSelfie", type: "boolean", description: "Request a selfie photo" })
  @ApiQuery({ name: "requestPOA", type: "boolean", description: "Request proof of address" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getIdentityDocumentVerificationURL(
    @AuthUser() consumer: Consumer,
    @Query("sessionKey") sessionKey: string,
    @Query("locale") locale: IDVerificationURLRequestLocale,
    @Query("requestBack") idBack = "false",
    @Query("requestSelfie") selfie = "false",
    @Query("requestPOA") poa = "false",
  ): Promise<IDVerificationURLResponseDTO> {
    const result = await this.verificationService.getDocumentVerificationURL(
      sessionKey,
      consumer.props.id,
      locale,
      idBack === "true", // This and the next 2 lines are a way of getting around params coming through as strings even though declared as booleans
      selfie === "true",
      poa === "true",
    );

    return {
      id: result.id,
      expiration: Date.parse(result.link.expiredAt),
      url: result.link.url,
    };
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

@IsNoApiKeyNeeded()
@Controller("v1/verify/webhook")
@ApiTags("Webhooks")
export class VerificationWebhookController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly alertService: AlertService;

  private readonly sardineConfigs: SardineConfigs;
  private readonly verificationResponseMapper: VerificationResponseMapper;

  constructor(private readonly verificationService: VerificationService, configService: CustomConfigService) {
    this.verificationResponseMapper = new VerificationResponseMapper();
    this.sardineConfigs = configService.get<SardineConfigs>(SARDINE_CONFIG_KEY);
  }

  @Post("/document/result")
  @HttpCode(200)
  async postDocumentVerificationResult(
    @Headers() headers: WebhookHeadersDTO,
    @Body() requestBody: DocumentVerificationWebhookRequestDTO,
    @Request() request: Request,
  ): Promise<DocumentVerificationResultDTO> {
    this.logger.info(`Received Sardine document verification webhook call: ${JSON.stringify(request.body)}`);

    // Throws an exception if invalid
    this.validateWebhookSignature(headers, request);

    try {
      const result = await this.verificationService.processDocumentVerificationWebhookResult(requestBody);
      if (!result) return null;
      return this.verificationResponseMapper.toDocumentResultDTO(result.status);
    } catch (err) {
      this.alertService.raiseError(
        `Error processing Sardine webhook document verification response: request body: ${JSON.stringify(
          request.body,
        )}: error: ${JSON.stringify(err)}`,
      );
      throw err;
    }
  }

  @Post("/case/notification")
  @HttpCode(200)
  async postCaseNotification(
    @Headers() headers: WebhookHeadersDTO,
    @Body() requestBody: CaseNotificationWebhookRequestDTO,
    @Request() request: Request,
  ): Promise<string> {
    this.logger.info(`Received Sardine case notification webhook call: ${JSON.stringify(request.body)}`);

    // Throws an exception if invalid
    this.validateWebhookSignature(headers, request);

    try {
      await this.verificationService.processKycVerificationWebhookRequest(requestBody);
      return "Successfully received";
    } catch (err) {
      this.alertService.raiseError(
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
      this.alertService.raiseError(
        `sardineSignature: ${sardineSignature}, hexString: ${computedSignature}, requestBody: ${JSON.stringify(
          request.body,
        )}`,
      );
      throw new ForbiddenException("Sardine webhook signature does not match");
    }
  }
}
