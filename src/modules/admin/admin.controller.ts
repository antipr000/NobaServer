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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
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
import { UpdatePartnerAdminRequestDTO } from "../partner/dto/UpdatePartnerAdminRequestDTO";
import { ConsumerDTO } from "../consumer/dto/ConsumerDTO";
import { AdminUpdateConsumerRequestDTO } from "./dto/AdminUpdateConsumerRequestDTO";
import { ConsumerService } from "../consumer/consumer.service";
import { ConsumerMapper } from "../consumer/mappers/ConsumerMapper";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";

@Controller("admins")
@ApiBearerAuth("JWT-auth")
@ApiTags("Admin")
@ApiHeaders(getCommonHeaders())
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

  @Inject()
  private readonly consumerService: ConsumerService;

  private readonly partnerAdminMapper: PartnerAdminMapper = new PartnerAdminMapper();
  private readonly partnerMapper: PartnerMapper = new PartnerMapper();
  private readonly consumerMapper: ConsumerMapper = new ConsumerMapper();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  // TODO: Add proper AuthN & AuthZ
  @Public()
  @Get(`/:${AdminId}/transactionmetrics`)
  @ApiOperation({ summary: "Gets all transaction metrics for a given partner" })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionStatsDTO, description: "Transaction statistics" })
  async getTransactionMetrics(@Param(AdminId) adminId: string): Promise<TransactionStatsDTO> {
    return this.adminService.getTransactionStatus();
  }

  // TODO: Add proper AuthN & AuthZ
  @Public()
  @Get(`/:${AdminId}/transactions`)
  @ApiOperation({ summary: "Gets all transactions filtered by the specified date range" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [TransactionDTO],
    description: "All transactions within the specified date range",
  })
  async getAllTransactions(
    @Param(AdminId) adminId: string,
    @Query() filterQuery: TransactionsFilterDTO,
  ): Promise<TransactionDTO[]> {
    return this.adminService.getAllTransactions(filterQuery.startDate, filterQuery.endDate);
  }

  @Post("/")
  @ApiOperation({ summary: "Creates a new Noba admin with the specified role" })
  @ApiResponse({ status: HttpStatus.OK, type: NobaAdminDTO, description: "The newly created Noba admin" })
  @ApiForbiddenResponse({ description: "User forbidden from adding new Noba admin" })
  @ApiConflictResponse({ description: "User is already a Noba admin" })
  async createNobaAdmin(@Request() request, @Body() nobaAdmin: NobaAdminDTO): Promise<NobaAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canAddNobaAdmin()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't add a new Noba admin.`);
    }

    const savedAdmin: Admin = await this.adminService.addNobaAdmin(this.adminMapper.toDomain(nobaAdmin));
    if (savedAdmin === undefined) {
      throw new ConflictException("User is already registered as a NobaAdmin");
    }

    return this.adminMapper.toDTO(savedAdmin);
  }

  @Get("/")
  @ApiOperation({ summary: "Gets the details of the logged in Noba admin" })
  @ApiResponse({ status: HttpStatus.OK, type: NobaAdminDTO, description: "The logged in Noba admin" })
  @ApiForbiddenResponse({ description: "User forbidden from retrieving details of the Noba admin" })
  async getNobaAdmin(@Request() request): Promise<NobaAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin)) {
      throw new ForbiddenException("This endpoint is only for Noba admins.");
    }

    return this.adminMapper.toDTO(authenticatedUser);
  }

  @Patch(`/:${AdminId}`)
  @ApiOperation({ summary: "Updates the details of a Noba admin" })
  @ApiResponse({ status: HttpStatus.OK, type: NobaAdminDTO, description: "The updated NobaAdmin." })
  @ApiForbiddenResponse({
    description: "User forbidden from updating Noba admin or attempt to update one's own record",
  })
  @ApiNotFoundResponse({ description: "Noba admin not found" })
  async updateNobaAdmin(
    @Request() request,
    @Param(AdminId) adminId: string,
    @Body() req: UpdateNobaAdminDTO,
  ): Promise<NobaAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
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

    const updatedAdmin: Admin = await this.adminService.updateNobaAdmin(
      adminId,
      req.role ?? adminToUpdate.props.role,
      req.name ?? adminToUpdate.props.name,
    );

    return this.adminMapper.toDTO(updatedAdmin);
  }

  @Delete(`/:${AdminId}`)
  @ApiOperation({ summary: "Deletes a Noba admin" })
  @ApiResponse({ status: HttpStatus.OK, type: DeleteNobaAdminDTO, description: "The ID of the Noba admin to delete" })
  @ApiForbiddenResponse({
    description: "User forbidden from deleting Noba admin or attempt to delete one's own record",
  })
  @ApiNotFoundResponse({ description: "Noba admin not found" })
  async deleteNobaAdmin(@Request() request, @Param(AdminId) adminId: string): Promise<DeleteNobaAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
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
  @ApiOperation({ summary: "Adds a new partner admin" })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartnerAdminDTO, description: "Adds a new partner admin" })
  @ApiForbiddenResponse({
    description: "User forbidden from adding a new partner admin",
  })
  @ApiBadRequestResponse({ description: "Invalid parameter(s)" })
  @ApiNotFoundResponse({ description: "Partner admin not found" })
  async addAdminsForPartners(
    @Param(PartnerID) partnerId: string,
    @Body() requestBody: AddPartnerAdminRequestDTO,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canAddAdminsToPartner()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't add PartnerAdmins.`);
    }

    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.addAdminForPartner(
      partnerId,
      requestBody.email,
      requestBody.name,
      requestBody.role,
    );
    return this.partnerAdminMapper.toDTO(partnerAdmin);
  }

  @Delete(`/partners/:${PartnerID}/admins/:${PartnerAdminID}`)
  @ApiOperation({ summary: "Deletes a partner admin" })
  @ApiResponse({ status: HttpStatus.OK, type: PartnerAdminDTO, description: "Add a new partner admin" })
  @ApiBadRequestResponse({ description: "Invalid parameter(s)" })
  @ApiForbiddenResponse({
    description: "User forbidden from deleting a partner admin",
  })
  @ApiNotFoundResponse({ description: "Partner admin not found" })
  async deleteAdminsForPartners(
    @Param(PartnerID) partnerId: string,
    @Param(PartnerAdminID) partnerAdminId: string,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canRemoveAdminsFromPartner()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't remove PartnerAdmins.`);
    }

    const deletedPartnerAdmin: PartnerAdmin = await this.partnerAdminService.deleteAdminForPartner(
      partnerId,
      partnerAdminId,
    );
    return this.partnerAdminMapper.toDTO(deletedPartnerAdmin);
  }

  @Patch(`/partners/:${PartnerID}/admins/:${PartnerAdminID}`)
  @ApiOperation({ summary: "Update details of a partner admin" })
  @ApiResponse({ status: HttpStatus.OK, type: PartnerAdminDTO, description: "Update details of a partner admin" })
  @ApiBadRequestResponse({ description: "Invalid parameter(s)" })
  @ApiForbiddenResponse({
    description: "User forbidden from updating a partner admin",
  })
  @ApiNotFoundResponse({ description: "Partner admin not found" })
  async updateAdminForPartners(
    @Param(PartnerID) partnerId: string,
    @Param(PartnerAdminID) partnerAdminID: string,
    @Body() requestBody: UpdatePartnerAdminRequestDTO,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canUpdateAdminsForPartner()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't update PartnerAdmins.`);
    }

    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.updateAdminForPartner(
      partnerId,
      partnerAdminID,
      requestBody,
    );
    return this.partnerAdminMapper.toDTO(partnerAdmin);
  }

  @Post("/partners")
  @ApiOperation({ summary: "Adds a new partner" })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartnerDTO, description: "New partner record" })
  @ApiForbiddenResponse({
    description: "User forbidden from adding a new partner",
  })
  @ApiBadRequestResponse({ description: "Invalid parameter(s)" })
  async registerPartner(@Body() requestBody: AddPartnerRequestDTO, @Request() request): Promise<PartnerDTO> {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canRegisterPartner()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't register a Partner.`);
    }

    const createdPartner: Partner = await this.partnerService.createPartner(requestBody.name);
    return this.partnerMapper.toDTO(createdPartner);
  }

  @Patch("/consumers/:consumerID")
  @ApiOperation({ summary: "Updates a consumer" })
  @ApiResponse({ status: HttpStatus.OK, type: ConsumerDTO, description: "Updated consumer record" })
  @ApiForbiddenResponse({
    description: "User forbidden from updating consumer record",
  })
  @ApiBadRequestResponse({ description: "Invalid parameter(s)" })
  async updateConsumer(
    @Param("consumerID") consumerID: string,
    @Body() requestBody: AdminUpdateConsumerRequestDTO,
    @Request() request,
  ) {
    const authenticatedUser: Admin = request.user.entity;
    if (!(authenticatedUser instanceof Admin) || !authenticatedUser.canUpdateConsumerData()) {
      throw new ForbiddenException(`Admins with role '${authenticatedUser.props.role}' can't update a Consumer.`);
    }

    const consumerData = await this.consumerService.getConsumer(consumerID);
    const updatedConsumerData = await this.consumerService.updateConsumer({
      ...consumerData.props,
      ...requestBody,
      verificationData: {
        ...consumerData.props.verificationData,
        ...requestBody.verificationData,
      },
    });

    return this.consumerMapper.toDTO(updatedConsumerData);
  }
}
