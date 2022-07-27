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
import {
  CaseNotificationWebhookRequest,
  DocumentVerificationWebhookRequest,
} from "./integrations/SardineTypeDefinitions";
import crypto from "crypto";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("verify")
@ApiTags("Verification")
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
    const consumer: Consumer = request.user;
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
    type: VerificationResultDTO,
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
    const consumer: Consumer = request.user;
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
  @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO, description: "Document verification result" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  @ApiNotFoundResponse({ description: "Document verification request not found" })
  async getDocumentVerificationResult(
    @Param("id") id: string,
    @Query("sessionKey") sessionKey: string,
    @Request() request,
  ): Promise<VerificationResultDTO> {
    const consumer: Consumer = request.user;
    const result = await this.verificationService.getDocumentVerificationResult(consumer.props._id, sessionKey, id);
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
  private readonly verificationResponseMapper: VerificationResponseMapper;

  constructor(private readonly verificationService: VerificationService) {
    this.verificationResponseMapper = new VerificationResponseMapper();
  }

  @Public()
  @Post("/document/result")
  @HttpCode(200)
  async postDocumentVerificationResult(
    @Headers() headers,
    @Body() requestBody: DocumentVerificationWebhookRequest,
  ): Promise<VerificationResultDTO> {
    this.logger.debug("Sardine document verification webhook: " + requestBody);
    const sardineSignature = headers["x-sardine-signature"];
    const hmac = crypto.createHmac("sha256", "");
    const data = hmac.update(JSON.stringify(requestBody));
    const hexString = data.digest("hex");
    if (sardineSignature !== hexString) {
      throw new ForbiddenException("Signature does not match");
    }
    const result = await this.verificationService.processDocumentVerificationWebhookResult(requestBody);
    return this.verificationResponseMapper.toDocumentResultDTO(result);
  }

  @Public()
  @Post("/case/notification")
  @HttpCode(200)
  async postCaseNotification(@Headers() headers, @Body() requestBody: CaseNotificationWebhookRequest): Promise<string> {
    // Logging this for initial debugging in staging and prod
    this.logger.debug("Sardine notification: " + requestBody);
    const sardineSignature = headers["x-sardine-signature"];
    const hmac = crypto.createHmac("sha256", "");
    const data = hmac.update(JSON.stringify(requestBody));
    const hexString = data.digest("hex");
    if (sardineSignature !== hexString) {
      throw new ForbiddenException("Signature does not match");
    }
    this.verificationService.processKycVerificationWebhookRequest(requestBody);
    return "Successfully received";
  }
}
