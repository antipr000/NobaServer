import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
  Request,
} from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PartnerID, PartnerAdminID } from "../auth/roles.decorator";
import { Partner } from "./domain/Partner";
import { PartnerAdmin } from "./domain/PartnerAdmin";
import { AddPartnerAdminRequestDTO } from "./dto/AddPartnerAdminRequestDTO";
import { PartnerAdminDTO } from "./dto/PartnerAdminDTO";
import { PartnerDTO } from "./dto/PartnerDTO";
import { UpdateTakeRateRequestDTO } from "./dto/UpdateTakeRateRequestDTO";
import { PartnerAdminMapper } from "./mappers/PartnerAdminMapper";
import { PartnerMapper } from "./mappers/PartnerMapper";
import { PartnerService } from "./partner.service";
import { PartnerAdminService } from "./partneradmin.service";

@ApiBearerAuth("JWT-auth")
@Controller("partner/:" + PartnerID)
@ApiTags("Partner")
export class PartnerController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;
  private readonly partnerMapper: PartnerMapper;
  private readonly partnerAdminMapper: PartnerAdminMapper;
  constructor(
    private readonly partnerService: PartnerService,
    private readonly partnerAdminService: PartnerAdminService,
  ) {
    this.partnerMapper = new PartnerMapper();
    this.partnerAdminMapper = new PartnerAdminMapper();
  }

  @Get("/")
  @ApiOperation({ summary: "Get partner details of requesting user" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartnerDTO,
    description: "Returns the partner details of currently logged in partner admin",
  })
  @ApiBadRequestResponse({ description: "User does not have permission" })
  async getPartner(@Param(PartnerID) partnerID: string, @Request() request): Promise<PartnerDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canGetPartnerDetails()) throw new ForbiddenException();
    const partner: Partner = await this.partnerService.getPartner(partnerID);
    return this.partnerMapper.toDTO(partner);
  }

  @Put("/take_rate")
  @ApiOperation({ summary: "Update take rate for partner" })
  @ApiResponse({ status: HttpStatus.OK, type: PartnerDTO, description: "Returns updated partner details" })
  @ApiBadRequestResponse({ description: "Invalid request" })
  async updateTakeRate(
    @Param(PartnerID) partnerID: string,
    @Body() requestBody: UpdateTakeRateRequestDTO,
    @Request() request,
  ): Promise<PartnerDTO> {
    // check for permissions
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canUpdatePartnerDetails()) throw new ForbiddenException();
    const partner: Partner = await this.partnerService.updateTakeRate(partnerID, requestBody.takeRate);
    return this.partnerMapper.toDTO(partner);
  }

  @Get("/admin/:" + PartnerAdminID)
  @ApiOperation({ summary: "Get details for partner admin" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartnerAdminDTO,
    description: "Returns details for the requesting partner admin",
  })
  @ApiBadRequestResponse({ description: "Not authorized" })
  async getPartnerAdmin(
    @Param(PartnerID) partnerID: string,
    @Param(PartnerAdminID) partnerAdminID: string,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (requestUser.props._id !== partnerAdminID && !requestUser.canGetAllAdmins()) throw new ForbiddenException();
    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.getPartnerAdmin(partnerAdminID);
    return this.partnerAdminMapper.toDTO(partnerAdmin);
  }

  @Get("/admins")
  @ApiOperation({ summary: "Get all admins for the partner" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [PartnerAdminDTO],
    description: "Returns details for all admins of the partner",
  })
  @ApiBadRequestResponse({ description: "Not authorized" })
  async getAllPartnerAdmins(@Param(PartnerID) partnerID: string, @Request() request): Promise<PartnerAdminDTO[]> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canGetAllAdmins()) throw new ForbiddenException();
    const partnerAdmins: PartnerAdmin[] = await this.partnerAdminService.getAllPartnerAdmins(partnerID);
    return partnerAdmins.map(partnerAdmin => this.partnerAdminMapper.toDTO(partnerAdmin));
  }

  @Post("/admin")
  @ApiOperation({ summary: "Add a new partner admin" })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartnerAdminDTO, description: "Add a new partner admin" })
  @ApiBadRequestResponse({ description: "Bad request" })
  async addPartnerAdmin(
    @Param(PartnerID) partnerID: string,
    @Body() requestBody: AddPartnerAdminRequestDTO,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canAddPartnerAdmin()) throw new ForbiddenException();

    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.addPartnerAdmin(partnerID, requestBody.email);
    return this.partnerAdminMapper.toDTO(partnerAdmin);
  }
}
