import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeaders,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
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
import { UpdatePartnerAdminRequestDTO } from "./dto/UpdatePartnerAdminRequestDTO";
import { TransactionsQueryResultsDTO } from "../transactions/dto/TransactionsQueryResultsDTO";
import { TransactionFilterOptions } from "../transactions/domain/Types";
import { TransactionService } from "../transactions/transaction.service";
import { TransactionDTO } from "../transactions/dto/TransactionDTO";

@ApiBearerAuth("JWT-auth")
@Controller("partners")
@ApiTags("Partner")
@ApiHeaders(getCommonHeaders())
export class PartnerController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;
  private readonly partnerMapper: PartnerMapper;
  private readonly partnerAdminMapper: PartnerAdminMapper;
  constructor(
    private readonly partnerService: PartnerService,
    private readonly partnerAdminService: PartnerAdminService,
    private readonly transactionService: TransactionService,
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
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
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
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
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
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
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
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
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
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
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
    @Body() requestBody: UpdatePartnerAdminRequestDTO,
    @Request() request,
  ): Promise<PartnerAdminDTO> {
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
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
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
    if (!requestUser.canRemovePartnerAdmin()) throw new ForbiddenException();
    const deletedPartnerAdmin = await this.partnerAdminService.deleteAdminForPartner(
      requestUser.props.partnerId,
      partnerAdminID,
    );
    return this.partnerAdminMapper.toDTO(deletedPartnerAdmin);
  }

  @Get("/admins/transactions")
  @ApiOperation({ summary: "Get all transactions for the given partner" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionsQueryResultsDTO,
    description: "All transactions for the partner",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getTransactions(
    @Request() request,
    @Query() transactionFilters: TransactionFilterOptions,
  ): Promise<TransactionsQueryResultsDTO> {
    const user = request.user.entity;
    if (!(user instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }

    if (!user.canViewAllTransactions()) {
      throw new ForbiddenException("You do not have sufficient privileges to view all transactions");
    }
    return (await this.transactionService.getAllTransactionsForPartner(
      user.props.partnerId,
      transactionFilters,
    )) as TransactionsQueryResultsDTO;
  }

  @Get("/admins/transactions/:transactionID")
  @ApiOperation({ summary: "Gets details of a transaction" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
    description: "Details of a transaction",
  })
  @ApiNotFoundResponse({ description: "Transaction does not exist" })
  async getTransaction(@Request() request, @Param("transactionID") transactionID: string): Promise<TransactionDTO> {
    const user = request.user.entity;
    if (!(user instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }

    if (!user.canViewAllTransactions()) {
      throw new ForbiddenException("You do not have sufficient privileges to view all transactions");
    }
    const transactionDTO = await this.transactionService.getTransaction(transactionID);

    if (transactionDTO.partnerID !== user.props.partnerId) {
      throw new NotFoundException("Transaction does not exist");
    }
    return transactionDTO;
  }
}
