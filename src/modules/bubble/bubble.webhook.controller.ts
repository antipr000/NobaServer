import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { BubbleWebhookAuthGuard } from "../auth/bubble.webhooks.auth.guard";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { BubbleService } from "./bubble.service";
import {
  CreatePayrollRequestDTO,
  CreatePayrollResponseDTO,
  DisbursementDTO,
  EnrichedDisbursementDTO,
  EmployeeCreateRequestDTO,
  EmployeeResponseDTO,
  PaginatedEmployeeResponseDTO,
  PayrollDTO,
  RegisterEmployerRequestDTO,
  UpdateEmployeeRequestDTO,
  UpdateEmployerRequestDTO,
  PaginatedEnrichedDisbursementResponseDTO,
} from "./dto/bubble.webhook.controller.dto";
import { EmployerRegisterResponseDTO } from "./dto/EmployerRegisterResponseDTO";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";
import { isValidDateString } from "../../core/utils/DateUtils";
import { BubbleWebhookMapper } from "./mapper/bubble.webhook.mapper";
import { EmployeeFilterOptionsDTO } from "../employee/dto/employee.filter.options.dto";
import { EnrichedDisbursementFilterOptionsDTO } from "../employer/dto/enriched.disbursement.filter.options.dto";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("/webhooks/bubble")
@ApiTags("Webhooks")
@IsNoApiKeyNeeded()
@ApiBearerAuth("JWT-auth")
@UseGuards(BubbleWebhookAuthGuard)
export class BubbleWebhookController {
  private readonly mapper: BubbleWebhookMapper;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly bubbleService: BubbleService,
  ) {
    this.mapper = new BubbleWebhookMapper();
  }

  @Post("/employers")
  @ApiOperation({ summary: "Register the Employer in Noba" })
  @ApiResponse({ status: HttpStatus.CREATED, type: EmployerRegisterResponseDTO })
  async registerEmployer(@Body() requestBody: RegisterEmployerRequestDTO): Promise<EmployerRegisterResponseDTO> {
    const nobaEmployerID: string = await this.bubbleService.registerEmployerInNoba({
      bubbleID: requestBody.bubbleID,
      logoURI: requestBody.logoURI,
      locale: requestBody.locale,
      name: requestBody.name,
      referralID: requestBody.referralID,
      leadDays: requestBody.leadDays,
      payrollDates: requestBody.payrollDates,
      payrollAccountNumber: requestBody.payrollAccountNumber,
      ...(requestBody.maxAllocationPercent && { maxAllocationPercent: requestBody.maxAllocationPercent }),
    });
    return {
      nobaEmployerID,
    };
  }

  @Get("/employers/:referralID/employees")
  @ApiOperation({ summary: "Get all employees for employer in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: [PaginatedEmployeeResponseDTO] })
  async getAllEmployees(
    @Param("referralID") referralID: string,
    @Query() filterOptions: EmployeeFilterOptionsDTO,
  ): Promise<PaginatedEmployeeResponseDTO> {
    const paginatedResult = await this.bubbleService.getAllEmployeesForEmployer(referralID, filterOptions);
    return this.mapper.toPaginatedEmployeeDTOs(paginatedResult);
  }

  @Post("/employers/:referralID/employees")
  @ApiOperation({ summary: "Creates a new employee for employer and sends an invite if specified" })
  @ApiResponse({ status: HttpStatus.CREATED, type: EmployeeResponseDTO })
  async createEmployee(
    @Param("referralID") referralID: string,
    @Body() requestBody: EmployeeCreateRequestDTO,
  ): Promise<EmployeeResponseDTO> {
    const employee = await this.bubbleService.createEmployeeForEmployer(referralID, requestBody);
    return this.mapper.toEmployeeResponseDTO(employee);
  }

  @Post("/employers/:referralID/employees/invite")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Sends an invite to multiple employees" })
  @ApiResponse({ status: HttpStatus.CREATED, type: BlankResponseDTO })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async sendInviteToEmployees(
    @Param("referralID") referralID: string,
    @UploadedFile("file") file: Express.Multer.File,
  ): Promise<BlankResponseDTO> {
    await this.bubbleService.bulkInviteEmployeesForEmployer(referralID, file);
    return {};
  }

  @Post("/employers/:referralID/payroll")
  @ApiOperation({ summary: "Creates payroll for employer in Noba" })
  @ApiResponse({ status: HttpStatus.CREATED, type: CreatePayrollResponseDTO })
  async createPayroll(
    @Param("referralID") referralID: string,
    @Body() request: CreatePayrollRequestDTO,
  ): Promise<CreatePayrollResponseDTO> {
    if (!isValidDateString(request.payrollDate)) {
      throw new BadRequestException("Invalid payrollDate");
    }

    const payroll = await this.bubbleService.createPayroll(referralID, request.payrollDate);
    return {
      payrollID: payroll.id,
    };
  }

  @Get("/employers/:referralID/payrolls")
  @ApiOperation({ summary: "Get all payrolls for employer in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: [PayrollDTO] })
  async getAllPayrolls(@Param("referralID") referralID: string): Promise<PayrollDTO[]> {
    const payrolls = await this.bubbleService.getAllPayrollsForEmployer(referralID);
    return payrolls.map(this.mapper.toPayrollDTO);
  }

  @Get("/employers/:referralID/payrolls/:payrollID")
  @ApiOperation({ summary: "Get specific payroll for employer in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: [PayrollDTO] })
  async getPayroll(
    @Param("referralID") referralID: string,
    @Param("payrollID") payrollID: string,
  ): Promise<PayrollDTO> {
    const payroll = await this.bubbleService.getPayroll(referralID, payrollID);

    return {
      ...this.mapper.toPayrollDTO(payroll),
    };
  }

  @Get("/employers/:referralID/disbursements/:employeeID")
  @ApiOperation({ summary: "Get all disbursements for employee in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: [DisbursementDTO] })
  async getAllDisbursementsForEmployee(
    @Param("referralID") referralID: string,
    @Param("employeeID") employeeID: string,
  ): Promise<DisbursementDTO[]> {
    const disbursements = await this.bubbleService.getAllDisbursementsForEmployee(referralID, employeeID);
    return disbursements.map(this.mapper.toDisbursementDTO);
  }

  @Get("/employers/:referralID/payrolls/:payrollID/disbursements")
  @ApiOperation({ summary: "Get all disbursements for payroll in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: [EnrichedDisbursementDTO] })
  async getAllEnrichedDisbursementsForPayroll(
    @Param("referralID") referralID: string,
    @Param("payrollID") payrollID: string,
    @Query() filterOptions: EnrichedDisbursementFilterOptionsDTO,
  ): Promise<PaginatedEnrichedDisbursementResponseDTO> {
    const paginatedResult = await this.bubbleService.getAllEnrichedDisbursementsForPayroll(
      referralID,
      payrollID,
      filterOptions,
    );
    if (!paginatedResult || paginatedResult.items?.length === 0) {
      throw new NotFoundException("No disbursements found for the given payroll");
    }

    return this.mapper.toPaginatedEnrichedDisbursementDTOs(paginatedResult);
  }

  @Patch("/employers/:referralID")
  @ApiOperation({ summary: "Update the Employer in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: BlankResponseDTO })
  async updateEmployer(
    @Body() requestBody: UpdateEmployerRequestDTO,
    @Param("referralID") referralID: string,
  ): Promise<BlankResponseDTO> {
    await this.bubbleService.updateEmployerInNoba(referralID, requestBody);
    return {};
  }

  @Patch("/employees/:employeeID")
  @ApiOperation({ summary: "Update the Employee in Noba" })
  @ApiResponse({ status: HttpStatus.OK, type: BlankResponseDTO })
  async updateEmployee(
    @Body() requestBody: UpdateEmployeeRequestDTO,
    @Param("employeeID") employeeID: string,
  ): Promise<BlankResponseDTO> {
    await this.bubbleService.updateEmployee(employeeID, requestBody);
    return {};
  }
}
