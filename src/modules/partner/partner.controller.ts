import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PartnerID, PartnerAdminID } from "../auth/roles.decorator";
import { Partner } from "./domain/Partner";
import { PartnerAdmin } from "./domain/PartnerAdmin";
import { AddPartnerAdminRequestDTO } from "./dto/AddPartnerAdminRequestDTO";
import { PartnerAdminDTO } from "./dto/PartnerAdminDTO";
import { PartnerDTO } from "./dto/PartnerDTO";
import { UpdatePartnerRequestDTO } from "./dto/UpdatePartnerRequestDTO";
import { PartnerAdminMapper } from "./mappers/PartnerAdminMapper";
import { PartnerMapper } from "./mappers/PartnerMapper";
import { PartnerService } from "./partner.service";
import { PartnerAdminService } from "./partneradmin.service";

@ApiBearerAuth("JWT-auth")
@Controller("partners")
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

  @Get("/:" + PartnerID)
  @ApiOperation({ summary: "Gets details of a partner" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartnerDTO,
    description: "Details of partner",
  })
  @ApiForbiddenResponse({ description: "User lacks permission to retrieve partner details" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getPartner(@Param(PartnerID) partnerID: string, @Request() request): Promise<PartnerDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canGetPartnerDetails()) throw new ForbiddenException();
    const partner: Partner = await this.partnerService.getPartner(partnerID);
    return this.partnerMapper.toDTO(partner);
  }

  @Patch("/")
  @ApiOperation({ summary: "Updates details of a partner" })
  @ApiResponse({ status: HttpStatus.OK, type: PartnerDTO, description: "Partner details" })
  @ApiForbiddenResponse({ description: "User lacks permission to update partner details" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async updatePartner(@Body() requestBody: UpdatePartnerRequestDTO, @Request() request): Promise<PartnerDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canUpdatePartnerDetails()) throw new ForbiddenException();
    const partner: Partner = await this.partnerService.updatePartner(requestUser.props.partnerId, requestBody);
    return this.partnerMapper.toDTO(partner);
  }

  @Get("/admins/:" + PartnerAdminID)
  @ApiOperation({ summary: "Gets details of a partner admin" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartnerAdminDTO,
    description: "Details of partner admin",
  })
  @ApiForbiddenResponse({ description: "User lacks permission to retrieve partner admin" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getPartnerAdmin(@Param(PartnerAdminID) partnerAdminID: string, @Request() request): Promise<PartnerAdminDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (requestUser.props._id !== partnerAdminID && !requestUser.canGetAllAdmins()) throw new ForbiddenException();
    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.getPartnerAdmin(partnerAdminID);
    return this.partnerAdminMapper.toDTO(partnerAdmin);
  }

  @Get("/admins")
  @ApiOperation({ summary: "Gets all admins for the partner" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [PartnerAdminDTO],
    description: "All admins of the partner",
  })
  @ApiForbiddenResponse({ description: "User lacks permission to retrieve partner admin list" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getAllPartnerAdmins(@Request() request): Promise<PartnerAdminDTO[]> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canGetAllAdmins()) throw new ForbiddenException();
    const partnerAdmins: PartnerAdmin[] = await this.partnerAdminService.getAllPartnerAdmins(
      requestUser.props.partnerId,
    );
    return partnerAdmins.map(partnerAdmin => this.partnerAdminMapper.toDTO(partnerAdmin));
  }

  @Post("/admins")
  @ApiOperation({ summary: "Adds a new partner admin" })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartnerAdminDTO, description: "New partner admin record" })
  @ApiForbiddenResponse({ description: "User lacks permission to add a new partner admin" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async addPartnerAdmin(@Body() requestBody: AddPartnerAdminRequestDTO, @Request() request): Promise<PartnerAdminDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canAddPartnerAdmin()) throw new ForbiddenException();

    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.addAdminForPartner(
      requestUser.props.partnerId,
      requestBody.email,
      requestBody.name,
      requestBody.role,
    );
    return this.partnerAdminMapper.toDTO(partnerAdmin);
  }

  @Patch("/admins/:" + PartnerAdminID)
  @ApiOperation({ summary: "Updates details of a partner admin" })
  @ApiResponse({ status: HttpStatus.OK, type: PartnerAdminDTO, description: "Details of updated partner admin" })
  @ApiForbiddenResponse({ description: "User lacks permission to update partner admin" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async updatePartnerAdmin(
    @Param(PartnerAdminID) partnerAdminID: string,
    @Body() requestBody: UpdatePartnerRequestDTO,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canUpdatePartnerAdmin()) throw new ForbiddenException();
    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.updateAdminForPartner(
      requestUser.props.partnerId,
      partnerAdminID,
      requestBody,
    );
    return this.partnerAdminMapper.toDTO(partnerAdmin);
  }

  @Delete("/admins/:" + PartnerAdminID)
  @ApiOperation({ summary: "Deletes a parter admin" })
  @ApiResponse({ status: HttpStatus.OK, type: PartnerAdminDTO, description: "Deleted partner admin record" })
  @ApiForbiddenResponse({ description: "User lacks permission to delete partner admin" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async deletePartnerAdmin(
    @Param(PartnerAdminID) partnerAdminID: string,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const requestUser: PartnerAdmin = request.user;
    if (!requestUser.canRemovePartnerAdmin()) throw new ForbiddenException();
    const deletedPartnerAdmin = await this.partnerAdminService.deleteAdminForPartner(
      requestUser.props.partnerId,
      partnerAdminID,
    );
    return this.partnerAdminMapper.toDTO(deletedPartnerAdmin);
  }
}
