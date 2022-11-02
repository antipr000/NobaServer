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
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
import { TransactionDTO } from "../transactions/dto/TransactionDTO";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { PartnerLogoUploadRequestDTO } from "./dto/PartnerLogoUploadRequestDTO";

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
  ) {
    this.partnerMapper = new PartnerMapper();
    this.partnerAdminMapper = new PartnerAdminMapper();
  }

  @Get("/")
  @ApiOperation({ summary: "Gets details of a partner" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartnerDTO,
    description: "Details of partner",
  })
  @ApiForbiddenResponse({ description: "User lacks permission to retrieve partner details" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getPartner(@Request() request): Promise<PartnerDTO> {
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
    if (!requestUser.canGetPartnerDetails()) throw new ForbiddenException();
    const partner: Partner = await this.partnerService.getPartner(requestUser.props.partnerId);
    if (!partner) {
      throw new NotFoundException();
    }
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

  @Get("/admins/:partnerAdminID")
  @ApiOperation({ summary: "Gets details of a partner admin" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartnerAdminDTO,
    description: "Details of partner admin",
  })
  @ApiForbiddenResponse({ description: "User lacks permission to retrieve partner admin" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getPartnerAdmin(@Param("partnerAdminID") partnerAdminID: string, @Request() request): Promise<PartnerAdminDTO> {
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

  @Patch("/admins/:partnerAdminID")
  @ApiOperation({ summary: "Updates details of a partner admin" })
  @ApiResponse({ status: HttpStatus.OK, type: PartnerAdminDTO, description: "Details of updated partner admin" })
  @ApiForbiddenResponse({ description: "User lacks permission to update partner admin" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async updatePartnerAdmin(
    @Param("partnerAdminID") partnerAdminID: string,
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

  @Delete("/admins/:partnerAdminID")
  @ApiOperation({ summary: "Deletes a parter admin" })
  @ApiResponse({ status: HttpStatus.OK, type: PartnerAdminDTO, description: "Deleted partner admin record" })
  @ApiForbiddenResponse({ description: "User lacks permission to delete partner admin" })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async deletePartnerAdmin(
    @Param("partnerAdminID") partnerAdminID: string,
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

  @Get("/transactions")
  @ApiOperation({ summary: "Get all transactions for the given partner" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionsQueryResultsDTO,
    description: "All transactions for the partner",
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  async getPartnerTransactions(
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
    return (await this.partnerService.getAllTransactionsForPartner(
      user.props.partnerId,
      transactionFilters,
    )) as TransactionsQueryResultsDTO;
  }

  @Get("/transactions/:transactionID")
  @ApiOperation({ summary: "Gets details of a transaction" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionDTO,
    description: "Details of a transaction",
  })
  @ApiNotFoundResponse({ description: "Transaction does not exist" })
  async getPartnerTransaction(
    @Request() request,
    @Param("transactionID") transactionID: string,
  ): Promise<TransactionDTO> {
    const user = request.user.entity;
    if (!(user instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }

    if (!user.canViewAllTransactions()) {
      throw new ForbiddenException("You do not have sufficient privileges to view the requested transaction");
    }
    const transactionDTO = await this.partnerService.getTransaction(transactionID);

    if (transactionDTO.partnerID !== user.props.partnerId) {
      throw new NotFoundException("Transaction does not exist");
    }
    return transactionDTO;
  }

  @Post("/logo")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Adds or updates partner logo" })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    type: PartnerDTO,
    description: "Updated Partner Info after adding or updating the logos",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        logo: {
          type: "string",
          format: "binary",
        },
        logoSmall: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: "Invalid request parameters" })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "logoSmall", maxCount: 1 },
      { name: "logo", maxCount: 1 },
    ]),
  )
  async uploadPartnerLogo(
    @UploadedFiles() files: PartnerLogoUploadRequestDTO,
    @Request() request,
  ): Promise<PartnerDTO> {
    const requestUser = request.user.entity;
    if (!(requestUser instanceof PartnerAdmin)) {
      throw new ForbiddenException("Only partner admins can access this endpoint");
    }
    if (!requestUser.canUpdatePartnerDetails()) throw new ForbiddenException();
    const partner: Partner = await this.partnerService.uploadPartnerLogo(requestUser.props.partnerId, files);
    return this.partnerMapper.toDTO(partner);
  }
}
