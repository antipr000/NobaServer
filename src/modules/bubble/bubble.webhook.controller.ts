import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { BubbleWebhookAuthGuard } from "../auth/bubble.webhooks.auth.guard";
import { IsNoApiKeyNeeded } from "../auth/public.decorator";
import { BubbleService } from "./bubble.service";
import {
  CreatePayrollRequestDTO,
  CreatePayrollResponseDTO,
  DisbursementDTO,
  PaginatedEmployeeResponseDTO,
  PayrollDTO,
  PayrollQueryDTO,
  RegisterEmployerRequestDTO,
  UpdateEmployeeRequestDTO,
  UpdateEmployerRequestDTO,
} from "./dto/bubble.webhook.controller.dto";
import { EmployerRegisterResponseDTO } from "./dto/EmployerRegisterResponseDTO";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";
import { isValidDateString } from "../../core/utils/DateUtils";
import { BubbleWebhookMapper } from "./mapper/bubble.webhook.mapper";
import { Bool } from "../../core/domain/ApiEnums";
import { EmployeeFilterOptionsDTO } from "../employee/dto/employee.filter.options.dto";

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
    @Query() query: PayrollQueryDTO,
  ): Promise<PayrollDTO> {
    const payrollWithDisbursements = await this.bubbleService.getPayrollWithDisbursements(
      referralID,
      payrollID,
      query.shouldIncludeDisbursements === Bool.True,
    );

    return {
      ...this.mapper.toPayrollDTO(payrollWithDisbursements),
      disbursements: payrollWithDisbursements.disbursements.map(this.mapper.toDisbursementDTO),
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
