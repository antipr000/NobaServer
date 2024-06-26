import { Injectable } from "@nestjs/common";
import Joi from "joi";
import { ServiceErrorCode, ServiceException } from "../../../../../core/exception/service.exception";
import { Utils } from "../../../../../core/utils/Utils";
import { AlertKey } from "../../../../common/alerts/alert.dto";
import { AlertService } from "../../../../common/alerts/alert.service";
import { KeysRequired } from "../../../../common/domain/Types";
import { Employee } from "../../../../employee/domain/Employee";
import { EmployeeService } from "../../../../employee/employee.service";
import { Employer } from "../../../../employer/domain/Employer";
import { Payroll } from "../../../../employer/domain/Payroll";
import { PayrollDisbursement } from "../../../../employer/domain/PayrollDisbursement";
import { EmployerService } from "../../../../employer/employer.service";
import { InputTransaction, Transaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { PayrollDepositTransactionRequest } from "../../../dto/transaction.service.dto";
import { TransactionProcessor } from "../transaction.processor";

@Injectable()
export class PayrollDepositProcessor implements TransactionProcessor {
  private readonly validationKeys: KeysRequired<PayrollDepositTransactionRequest> = {
    disbursementID: Joi.string().required(),
  };

  constructor(
    private readonly employerService: EmployerService,
    private readonly employeeService: EmployeeService,
    private readonly alertService: AlertService,
  ) {}

  async validate(request: PayrollDepositTransactionRequest): Promise<void> {
    this.performStaticValidations(request);
    await this.performDynamicValidations(request);
  }

  async convertToRepoInputTransaction(request: PayrollDepositTransactionRequest): Promise<InputTransaction> {
    const payrollDisbursement: PayrollDisbursement = await this.employerService.getDisbursement(request.disbursementID);

    const payroll: Payroll = await this.employerService.getPayrollByID(payrollDisbursement.payrollID);
    if (!payroll) {
      this.alertService.raiseCriticalAlert({
        key: AlertKey.POSSIBLE_DATA_CORRUPTION,
        message: `Payroll disbursement with ID '${payrollDisbursement.id}' exist but corresponding Payroll with ID '${payrollDisbursement.payrollID} not found.`,
      });
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Payroll disbursement with ID '${payrollDisbursement.id}' exist but corresponding Payroll with ID '${payrollDisbursement.payrollID} not found.`,
      });
    }

    const employer: Employer = await this.employerService.getEmployerByID(payroll.employerID);
    if (!employer) {
      this.alertService.raiseCriticalAlert({
        key: AlertKey.POSSIBLE_DATA_CORRUPTION,
        message: `Employer '${payroll.employerID}' for payroll ID '${payroll.id}' does not exist.`,
      });
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Employer '${payroll.employerID}' for payroll ID '${payroll.id}' does not exist.`,
      });
    }

    const employee: Employee = await this.employeeService.getEmployeeByID(payrollDisbursement.employeeID);
    if (!employee) {
      this.alertService.raiseCriticalAlert({
        key: AlertKey.POSSIBLE_DATA_CORRUPTION,
        message: `Employee with ID '${payrollDisbursement.employeeID}' not found.`,
      });
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Employee with ID '${payrollDisbursement.employeeID}' not found.`,
      });
    }

    const employerName = employer.name;
    return {
      workflowName: WorkflowName.PAYROLL_DEPOSIT,
      exchangeRate: payroll.exchangeRate,
      memo: `${employerName} Payroll for ${payroll.payrollDate}`,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
      sessionKey: "PAYROLL",
      debitAmount: payrollDisbursement.allocationAmount,
      debitCurrency: Currency.COP,
      creditAmount: Utils.roundTo2DecimalNumber(payrollDisbursement.allocationAmount * payroll.exchangeRate),
      creditCurrency: Currency.USD,
      creditConsumerID: employee.consumerID,
    };
  }

  async performPostProcessing(
    request: PayrollDepositTransactionRequest,
    createdTransaction: Transaction,
  ): Promise<void> {}

  private performStaticValidations(request: PayrollDepositTransactionRequest): void {
    const validationSchema = Joi.object(this.validationKeys).options({
      allowUnknown: false,
      stripUnknown: true,
    });

    Joi.attempt(request, validationSchema);
  }

  private async performDynamicValidations(request: PayrollDepositTransactionRequest): Promise<void> {
    const payrollDisbursement: PayrollDisbursement = await this.employerService.getDisbursement(request.disbursementID);
    if (!payrollDisbursement) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `Payroll disbursement with ID '${request.disbursementID}' not found.`,
      });
    }
  }
}
