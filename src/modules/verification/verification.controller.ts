import { Body, Controller, Get, HttpStatus, Inject, Param, Post, Request } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Status } from "../../externalclients/idvproviders/definitions";
import IDVIntegrator from "../../externalclients/idvproviders/IDVIntegrator";
import TruliooIntegrator from "../../externalclients/idvproviders/providers/trulioo/TruliooIntegrator";
import { Role } from "../auth/role.enum";
import { Roles, UserID } from "../auth/roles.decorator";
import { UserService } from "../user/user.service";
import { ConsentDTO } from "./dto/ConsentDTO";
import { DocVerificationRequestDTO } from "./dto/DocVerificationRequestDTO";
import { IDVerificationRequestDTO } from "./dto/IDVerificationRequestDTO";
import { SubdivisionDTO } from "./dto/SubdivisionDTO";
import { VerificationResultDTO } from "./dto/VerificationResultDTO";
import { VerificationStatusDTO } from "./dto/VerificationStatusDTO";
import { VerificationService } from "./verification.service";

@Roles(Role.User)
@ApiBearerAuth("JWT-auth")
@Controller("verify")
@ApiTags("Verification")
export class VerificationController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  idvProvider: IDVIntegrator;

  constructor(
    private readonly verificationService: VerificationService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.idvProvider = new TruliooIntegrator(configService);
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

  @Post(`/:${UserID}` + "/id")
  @ApiOperation({ summary: "Get verification result" })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationResultDTO, description: "Get verification result" })
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
  async verifyUser(
    @Param(UserID) id: string,
    @Body() requestBody: IDVerificationRequestDTO,
    @Request() request,
  ): Promise<VerificationResultDTO> {
    return this.verificationService.performIdentityVerification(request.user, requestBody);
  }

  //TODO: Setting data type of request to DocVerificationRequestDTO throws error. Figure out why
  // TODO: Figure out type for files
  @Post(`/:${UserID}` + "/doc")
  @ApiOperation({ summary: "Get verification result" })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: VerificationResultDTO, description: "Get verification result" })
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
  async verifyDocument(
    @Param(UserID) id: string,
    @Body() requestData: DocVerificationRequestDTO,
    @Request() request,
  ): Promise<VerificationResultDTO> {
    const documentFrontImageb64 = requestData.documentFrontImage;
    const documentBackImageb64 = requestData.documentBackImage;
    this.verificationService.performDocumentVerification(
      documentFrontImageb64,
      documentBackImageb64,
      request.user,
      requestData["countryCode"],
      requestData["documentType"],
    );
    return {
      status: Status.PENDING,
    };
  }

  @Get(`/:${UserID}` + "/doc/status")
  @ApiOperation({ summary: "Get KYC status of the given user" })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationStatusDTO, description: "Get KYC status of the given user" })
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
  async getDocumentVerificationStatus(@Param(UserID) id: string, @Request() request): Promise<VerificationStatusDTO> {
    return this.verificationService.getDocumentVerificationStatus(request.user);
  }

  @Get(`/:${UserID}` + "/doc/result")
  @ApiOperation({ summary: "Get KYC result of the given user" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: VerificationResultDTO,
    description: "TODO Ask soham from usability perspective how is this any different than /status",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters!" })
  async getDocumentVerificationResult(@Param(UserID) id: string, @Request() request): Promise<VerificationResultDTO> {
    return this.verificationService.getDocumentVerificationResult(request.user);
  }
}
