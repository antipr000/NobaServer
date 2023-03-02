import { Body, Controller, Get, HttpStatus, Inject, Param, Patch, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PayrollDTO } from "./dto/PayrollDTO";
import { PayrollStatus } from "./domain/Payroll";
import {
  CreateDisbursementRequestDTO,
  UpdateDisbursementRequestDTO,
  UpdatePayrollRequestDTO,
} from "./dto/payroll.workflow.controller.dto";
import { BlankResponseDTO } from "../../modules/common/dto/BlankResponseDTO";
import { PayrollDisbursementDTO } from "./dto/PayrollDisbursementDTO";

@Controller("wf/v1/payroll")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class PayrollWorkflowController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Post("/:payrollID/disbursement")
  @ApiOperation({ summary: "Creates a disbursement for employee" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: PayrollDisbursementDTO,
  })
  @ApiNotFoundResponse({ description: "Requested employee is not found" })
  @ApiBadRequestResponse({ description: "Failed to create disbursement" })
  async createDisbursement(@Body() requestBody: CreateDisbursementRequestDTO): Promise<PayrollDisbursementDTO> {
    return {
      id: "123",
      employeeID: requestBody.employeeID,
      payrollID: "123",
      debitAmount: 123,
    };
  }

  @Patch("/:payrollID/disbursement/:disbursementID")
  @ApiOperation({ summary: "Updates the disbursement record for an employee" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: BlankResponseDTO,
  })
  @ApiNotFoundResponse({ description: "Requested disbursement is not found" })
  @ApiBadRequestResponse({ description: "Failed to update disbursement" })
  async patchDisbursement(
    @Param("payrollID") payrollID: string,
    @Param("disbursementID") disbursementID: string,
    @Body() requestBody: UpdateDisbursementRequestDTO,
  ): Promise<BlankResponseDTO> {
    return {};
  }

  @Post("/:payrollID/invoice")
  @ApiOperation({ summary: "Creates an invoice for employer" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: BlankResponseDTO,
  })
  @ApiNotFoundResponse({ description: "Requested employer is not found" })
  @ApiBadRequestResponse({ description: "Failed to create invoice" })
  async createInvoice(@Param("payrollID") payrollID: string): Promise<BlankResponseDTO> {
    return {};
  }

  @Get("/:payrollID")
  @ApiOperation({ summary: "Gets details of payroll" })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PayrollDTO,
  })
  @ApiNotFoundResponse({ description: "Requested payroll is not found" })
  async getPayroll(@Param("payrollID") payrollID: string): Promise<PayrollDTO> {
    return {
      id: payrollID,
      employerID: "123",
      reference: "123",
      payrollDate: "123",
      totalDebitAmount: 10000,
      totalCreditAmount: 10,
      exchangeRate: 123,
      debitCurrency: "COP",
      creditCurrency: "USD",
      status: PayrollStatus.CREATED,
    };
  }

  @Patch("/:payrollID")
  @ApiOperation({ summary: "Updates the payroll" })
  @ApiResponse({
    description: "Payroll updated",
    status: HttpStatus.OK,
    type: PayrollDTO,
  })
  @ApiNotFoundResponse({ description: "Requested payroll is not found" })
  @ApiBadRequestResponse({ description: "Invalid parameters" })
  async patchPayroll(
    @Param("payrollID") payrollID: string,
    @Body() requestBody: UpdatePayrollRequestDTO,
  ): Promise<PayrollDTO> {
    return {
      id: payrollID,
      employerID: "123",
      reference: "123",
      payrollDate: "123",
      totalDebitAmount: 10000,
      totalCreditAmount: 10,
      exchangeRate: 123,
      debitCurrency: "COP",
      creditCurrency: "USD",
      status: requestBody.status ?? PayrollStatus.CREATED,
    };
  }
}
