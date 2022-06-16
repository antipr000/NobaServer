import {
  Controller,
  Get,
  Inject,
  HttpStatus,
  Query,
  Param,
  Post,
  Body,
  ConflictException,
  Put,
  Delete,
  Request,
  ForbiddenException,
  Patch,
  NotFoundException,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { AdminId, PartnerAdminID, PartnerID } from "../auth/roles.decorator";
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { TransactionStatsDTO } from "./dto/TransactionStats";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
import { TransactionsFilterDTO } from "./dto/TransactionsFilterDTO";
import { NobaAdminDTO } from "./dto/NobaAdminDTO";
import { Admin } from "./domain/Admin";
import { AdminMapper } from "./mappers/AdminMapper";
import { Public } from "../auth/public.decorator";
import { UpdateNobaAdminDTO } from "./dto/UpdateNobaAdminDTO";
import { DeleteNobaAdminDTO } from "./dto/DeleteNobaAdminDTO";
import { PartnerAdminDTO } from "../partner/dto/PartnerAdminDTO";
import { AddPartnerAdminRequestDTO } from "../partner/dto/AddPartnerAdminRequestDTO";
import { PartnerAdmin } from "../partner/domain/PartnerAdmin";
import { PartnerAdminService } from "../partner/partneradmin.service";
import { PartnerAdminMapper } from "../partner/mappers/PartnerAdminMapper";
import { AddPartnerRequestDTO } from "./dto/AddPartnerRequestDTO";
import { PartnerDTO } from "../partner/dto/PartnerDTO";
import { PartnerService } from "../partner/partner.service";
import { Partner } from "../partner/domain/Partner";
import { PartnerMapper } from "../partner/mappers/PartnerMapper";

@Controller("admins")
@ApiBearerAuth("JWT-auth")
@ApiTags("Admin")
export class AdminController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly adminService: AdminService;

  @Inject()
  private readonly adminMapper: AdminMapper;

  @Inject()
  private readonly partnerAdminService: PartnerAdminService;

  @Inject()
  private readonly partnerService: PartnerService;

  private readonly partnerAdminMapper: PartnerAdminMapper = new PartnerAdminMapper();
  private readonly partnerMapper: PartnerMapper = new PartnerMapper();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() { }

  // TODO: Add proper AuthN & AuthZ
  @Public()
  @Get(`/:${AdminId}/transaction_metrics`)
  @ApiOperation({ summary: "Get all transaction metrics for a given partner." })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionStatsDTO, description: "Get transaction statistics" })
  async getTransactionMetrics(@Param(AdminId) adminId: string): Promise<TransactionStatsDTO> {
    return await this.adminService.getTransactionStatus();
  }

  // TODO: Add proper AuthN & AuthZ
  @Public()
  @Get(`/:${AdminId}/transactions`)
  @ApiOperation({ summary: "Get all transactions filtered by the specified date range" })
  @ApiResponse({ status: HttpStatus.OK, type: [TransactionDTO] })
  async getAllTransactions(
    @Param(AdminId) adminId: string,
    @Query() filterQuery: TransactionsFilterDTO,
  ): Promise<TransactionDTO[]> {
    return await this.adminService.getAllTransactions(filterQuery.startDate, filterQuery.endDate);
  }

  @Post("/")
  @ApiOperation({ summary: "Creates a new NobaAdmin with a specified role." })
  @ApiResponse({ status: HttpStatus.OK, type: NobaAdminDTO, description: "The newly created Noba Admin." })
  async createNobaAdmin(@Request() request, @Body() nobaAdmin: NobaAdminDTO): Promise<NobaAdminDTO> {
    const authenticatedUser: Admin = request.user;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canAddNobaAdmin()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't add a new Noba Admin.`);
    }

    const savedAdmin: Admin = await this.adminService.addNobaAdmin(this.adminMapper.toDomain(nobaAdmin));
    if (savedAdmin === undefined) {
      throw new ConflictException("User is already registerd as a NobaAdmin");
    }

    return this.adminMapper.toDTO(savedAdmin);
  }

  @Patch(`/:${AdminId}`)
  @ApiOperation({ summary: "Updates the role/name of a NobaAdmin." })
  @ApiResponse({ status: HttpStatus.OK, type: NobaAdminDTO, description: "The updated NobaAdmin." })
  async updateNobaAdmin(
    @Request() request,
    @Param(AdminId) adminId: string,
    @Body() req: UpdateNobaAdminDTO,
  ): Promise<NobaAdminDTO> {
    const authenticatedUser: Admin = request.user;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canChangeNobaAdminPrivileges()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't update NobaAdmins.`);
    }

    if (authenticatedUser.props._id === adminId) {
      throw new ForbiddenException("You can't update your own identity.");
    }

    const adminToUpdate: Admin = await this.adminService.getAdminById(adminId);
    if (adminToUpdate === undefined) {
      throw new NotFoundException(`Admin with id ${adminId} not found.`);
    }

    const updatedAdmin: Admin =
      await this.adminService.updateNobaAdmin(
        adminId,
        req.role ?? adminToUpdate.props.role,
        req.name ?? adminToUpdate.props.name);

    return this.adminMapper.toDTO(updatedAdmin);
  }

  @Delete(`/:${AdminId}`)
  @ApiOperation({ summary: "Deletes the NobaAdmin with a given ID" })
  @ApiResponse({ status: HttpStatus.OK, type: DeleteNobaAdminDTO, description: "The ID of the deleted NobaAdmin." })
  async deleteNobaAdmin(@Request() request, @Param(AdminId) adminId: string): Promise<DeleteNobaAdminDTO> {
    const authenticatedUser: Admin = request.user;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canRemoveNobaAdmin()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't update privileges.`);
    }

    if (authenticatedUser.props._id === adminId) {
      throw new ForbiddenException("You can't delete your own account.");
    }

    const deletedAdminId: string = await this.adminService.deleteNobaAdmin(adminId);

    const result = new DeleteNobaAdminDTO();
    result._id = deletedAdminId;
    return result;
  }

  @Post(`/partners/:${PartnerID}/admins`)
  @ApiOperation({ summary: "Add a new partner admin" })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartnerAdminDTO, description: "Add a new partner admin" })
  @ApiBadRequestResponse({ description: "Bad request" })
  async addAdminsForPartners(
    @Param(PartnerID) partnerId: string,
    @Body() requestBody: AddPartnerAdminRequestDTO,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const authenticatedUser: Admin = request.user;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canAddAdminsToPartner()) {
      throw new ForbiddenException(
        `Admins with role '${authenticatedUser.props.role}' can't add PartnerAdmins.`);
    }

    const partnerAdmin: PartnerAdmin =
      await this.partnerAdminService.addAdminForPartner(partnerId, requestBody.email, requestBody.name, requestBody.role);
    return this.partnerAdminMapper.toDTO(partnerAdmin);
  }

  @Delete(`/partners/:${PartnerID}/admins/:${PartnerAdminID}`)
  @ApiOperation({ summary: "Add a new partner admin" })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartnerAdminDTO, description: "Add a new partner admin" })
  @ApiBadRequestResponse({ description: "Bad request" })
  async deleteAdminsForPartners(
    @Param(PartnerID) partnerId: string,
    @Param(PartnerAdminID) partnerAdminId: string,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const authenticatedUser: Admin = request.user;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canRemoveAdminsFromPartner()) {
      throw new ForbiddenException(
        `Admins with role '${authenticatedUser.props.role}' can't remove PartnerAdmins.`);
    }

    const deletedPartnerAdmin: PartnerAdmin =
      await this.partnerAdminService.deleteAdminForPartner(partnerId, partnerAdminId);
    return this.partnerAdminMapper.toDTO(deletedPartnerAdmin);
  }

  @Post(`/partners`)
  @ApiOperation({ summary: "Add a new partner" })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartnerDTO, description: "Add a new partner" })
  @ApiBadRequestResponse({ description: "Bad request" })
  async registerPartner(
    @Body() requestBody: AddPartnerRequestDTO,
    @Request() request,
  ): Promise<PartnerDTO> {
    const authenticatedUser: Admin = request.user;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canRegisterPartner()) {
      throw new ForbiddenException(
        `Admins with role '${authenticatedUser.props.role}' can't register a Partner.`);
    }

    const createdPartner: Partner = await this.partnerService.createPartner(requestBody.name);
    return this.partnerMapper.toDTO(createdPartner);
  }
}
