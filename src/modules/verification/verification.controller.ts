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
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
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
import { ConsentDTO } from "./dto/ConsentDTO";
import { DocumentsFileUploadRequestDTO, DocVerificationRequestDTO } from "./dto/DocVerificationRequestDTO";
import { IDVerificationRequestDTO } from "./dto/IDVerificationRequestDTO";
import { SubdivisionDTO } from "./dto/SubdivisionDTO";
import { VerificationResultDTO } from "./dto/VerificationResultDTO";
import { VerificationService } from "./verification.service";
import { Public } from "../auth/public.decorator";
import { VerificationResponseMapper } from "./mappers/VerificationResponseMapper";
import { User } from "../user/domain/User";

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
  @ApiOperation({ summary: "Check if verification service is up" })
  @ApiResponse({ status: HttpStatus.OK, description: "Health check for verification service" })
  async getVerificationStatus(): Promise<string> {
    return "Hello Noba user. Verification seems to work fine!";
  }

  @Get("/countryCodes")
  @ApiOperation({ summary: "Get list of country codes that Noba supports" })
  @ApiResponse({ status: HttpStatus.OK, description: "Get country codes for supported countries" })
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
  async getCountryCodes(): Promise<Array<string>> {
    return this.verificationService.getCountryCodes();
  }

  @Get("/consents/:countryCode")
  @ApiOperation({ summary: "Get all consents for a given country code" })
  @ApiResponse({ status: HttpStatus.OK, type: [ConsentDTO], description: "Get all consents" })
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
  async getConsents(@Param("countryCode") countryCode: string): Promise<Array<ConsentDTO>> {
    return this.verificationService.getConsents(countryCode);
  }

  @Get("/subdivisions/:countryCode")
  @ApiOperation({ summary: "Get subdivision for the given country code" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [SubdivisionDTO],
    description: "Get subdivision for the given country code",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
  async getSubdivisions(@Param("countryCode") countryCode: string): Promise<Array<SubdivisionDTO>> {
    return this.verificationService.getSubdivisions(countryCode);
  }

  @Public()
  @Post("/session")
  @ApiOperation({ summary: "Create a new session for verification" })
  @ApiResponse({ status: HttpStatus.CREATED, type: String, description: "Get new session token" })
  @ApiBadRequestResponse({ description: "Invalid request" })
  async createSession(): Promise<string> {
    const verificationData = await this.verificationService.createSession();
    return verificationData.props._id;
  }

  @Post("/consumerinfo")
  @ApiOperation({
    summary: "Verify consumer provided information like name, date of birth, address and ssn(for US consumers)",
  })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO, description: "Get verification result" })
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
  async verifyUser(
    @Query("sessionKey") sessionKey: string,
    @Body() requestBody: IDVerificationRequestDTO,
    @Request() request,
  ): Promise<VerificationResultDTO> {
    const user: User = request.user;
    const result = await this.verificationService.verifyConsumerInformation(user.props._id, sessionKey, {
      ...requestBody,
      userID: user.props._id,
      email: user.props.email,
    });
    return this.verificationResponseMapper.toConsumerInformationResultDTO(result);
  }

  @Post("/document")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Verify consumer uploaded id documents like national id, passport etc" })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: VerificationResultDTO,
    description: "Get id for submitted verification documents",
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
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
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
    const user: User = request.user;
    const result = await this.verificationService.verifyDocument(user.props._id, sessionKey, {
      userID: user.props._id,
      documentType: requestData.documentType,
      documentFrontImage: files.frontImage[0],
      documentBackImage: files.backImage?.length > 0 ? files.backImage[0] : undefined,
      photoImage: files.photoImage?.length > 0 ? files.photoImage[0] : undefined,
    });

    return result;
  }

  @Get("/document/result/:id")
  @ApiOperation({ summary: "Get result for a submitted document verification" })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO, description: "Get verification result" })
  @ApiBadRequestResponse({ description: "Invalid id" })
  async getDocumentVerificationResult(
    @Param("id") id: string,
    @Query("sessionKey") sessionKey: string,
    @Request() request,
  ): Promise<VerificationResultDTO> {
    const user: User = request.user;
    const result = await this.verificationService.getDocumentVerificationResult(user.props._id, sessionKey, id);
    return this.verificationResponseMapper.toDocumentResultDTO(result);
  }
}
