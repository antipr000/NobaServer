import { Body, Controller, Get, HttpStatus, Inject, NotFoundException, Param, Patch, Post } from "@nestjs/common";
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
import {
  CreateDisbursementRequestDTO,
  UpdateDisbursementRequestDTO,
  UpdatePayrollRequestDTO,
} from "./dto/payroll.workflow.controller.dto";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";
import { PayrollDisbursementDTO } from "./dto/PayrollDisbursementDTO";
import { EmployerService } from "./employer.service";

@Controller("wf/v1/payrolls")
@ApiBearerAuth("JWT-auth")
@ApiTags("Workflow")
export class PayrollWorkflowController {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly employerService: EmployerService;

  @Post("/:payrollID/disbursements")
  @ApiOperation({ summary: "Creates a disbursement for employee" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: PayrollDisbursementDTO,
  })
  @ApiNotFoundResponse({ description: "Requested employee is not found" })
  @ApiBadRequestResponse({ description: "Failed to create disbursement" })
  async createDisbursement(
    @Param("payrollID") payrollID: string,
    @Body() requestBody: CreateDisbursementRequestDTO,
  ): Promise<PayrollDisbursementDTO> {
    const disbursement = await this.employerService.createDisbursement(payrollID, requestBody);

    return {
      id: disbursement.id,
      employeeID: disbursement.employeeID,
      payrollID: disbursement.payrollID,
      allocationAmount: disbursement.allocationAmount,
    };
  }

  @Patch("/:payrollID/disbursements/:disbursementID")
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
    await this.employerService.updateDisbursement(payrollID, disbursementID, requestBody);
    return {};
  }

  @Post("/:payrollID/invoices")
  @ApiOperation({ summary: "Creates an invoice for employer" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: BlankResponseDTO,
  })
  @ApiNotFoundResponse({ description: "Requested employer is not found" })
  @ApiBadRequestResponse({ description: "Failed to create invoice" })
  async createInvoice(@Param("payrollID") payrollID: string): Promise<BlankResponseDTO> {
    await this.employerService.createInvoice(payrollID);
    return {};
  }

  @Post("/:payrollID/receipts")
  @ApiOperation({ summary: "Creates a receipt for employer" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: BlankResponseDTO,
  })
  @ApiNotFoundResponse({ description: "Requested employer is not found" })
  @ApiBadRequestResponse({ description: "Failed to create receipt" })
  async createReceipt(@Param("payrollID") payrollID: string): Promise<BlankResponseDTO> {
    await this.employerService.createInvoiceReceipt(payrollID);
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
    const payroll = await this.employerService.getPayrollByID(payrollID);

    if (!payroll) {
      throw new NotFoundException(`Payroll with id ${payrollID} is not found`);
    }

    return {
      id: payroll.id,
      employerID: payroll.employerID,
      reference: payroll.referenceNumber,
      payrollDate: payroll.payrollDate,
      totalDebitAmount: payroll.totalDebitAmount,
      totalCreditAmount: payroll.totalCreditAmount,
      exchangeRate: payroll.exchangeRate,
      debitCurrency: payroll.debitCurrency,
      creditCurrency: payroll.creditCurrency,
      status: payroll.status,
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
    const payroll = await this.employerService.updatePayroll(payrollID, requestBody);
    return {
      id: payroll.id,
      employerID: payroll.employerID,
      reference: payroll.referenceNumber,
      payrollDate: payroll.payrollDate,
      totalDebitAmount: payroll.totalDebitAmount,
      totalCreditAmount: payroll.totalCreditAmount,
      exchangeRate: payroll.exchangeRate,
      debitCurrency: payroll.debitCurrency,
      creditCurrency: payroll.creditCurrency,
      status: payroll.status,
    };
  }
}
