import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { AlertService } from "../../../../common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../../common/mocks/mock.alert.service";
import { EmployeeService } from "../../../../employee/employee.service";
import { getMockEmployeeServiceWithDefaults } from "../../../../employee/mocks/mock.employee.service";
import { EmployerService } from "../../../../employer/employer.service";
import { getMockEmployerServiceWithDefaults } from "../../../../employer/mocks/mock.employer.service";
import { PayrollDepositTransactionRequest } from "../../../dto/transaction.service.dto";
import { anything, capture, instance, when } from "ts-mockito";
import { uuid } from "uuidv4";
import { PayrollDepositProcessor } from "../implementations/payroll.deposit.processor";
import { ServiceErrorCode, ServiceException } from "../../../../../core/exception/service.exception";
import { getRandomEmployee } from "../../../../employee/test_utils/employee.test.utils";
import { getRandomPayroll, getRandomPayrollDisbursement } from "../../../../employer/test_utils/payroll.test.utils";
import { Payroll } from "../../../../employer/domain/Payroll";
import { Employee } from "../../../../employee/domain/Employee";
import { PayrollDisbursement } from "../../../../employer/domain/PayrollDisbursement";
import { AlertKey } from "../../../../common/alerts/alert.dto";
import { Employer } from "../../../../employer/domain/Employer";
import { getRandomEmployer } from "../../../../employer/test_utils/employer.test.utils";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";

describe("PayrollDepositPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let employeeService: EmployeeService;
  let employerService: EmployerService;
  let alertService: AlertService;
  let payrollDepositPreprocessor: PayrollDepositProcessor;

  beforeEach(async () => {
    employeeService = getMockEmployeeServiceWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();
    alertService = getMockAlertServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        {
          provide: AlertService,
          useFactory: () => instance(alertService),
        },
        PayrollDepositProcessor,
      ],
    }).compile();

    payrollDepositPreprocessor = app.get<PayrollDepositProcessor>(PayrollDepositProcessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    const DISBURSEMENT_ID = "DISBURSEMENT_ID";
    const VALID_REQUEST: PayrollDepositTransactionRequest = {
      disbursementID: DISBURSEMENT_ID,
    };

    describe("Static validations", () => {
      it("should throw error if request is null", async () => {
        try {
          await payrollDepositPreprocessor.validate(null);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining("object"));
        }
      });

      it("should throw error if request is undefined", async () => {
        try {
          await payrollDepositPreprocessor.validate(null);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining("object"));
        }
      });

      it.each(["disbursementID"])("should throw error if '%s' is not specified", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        delete request[field];

        try {
          await payrollDepositPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });
    });

    describe("Dynamic validations", () => {
      it("should throw ServiceException with DOES_NOT_EXIST error if the Disbursement is not found", async () => {
        const payrollDisbursementID = uuid();
        when(employerService.getDisbursement(payrollDisbursementID)).thenResolve(null);

        try {
          await payrollDepositPreprocessor.validate({
            disbursementID: payrollDisbursementID,
          });
          expect(true).toBe(false);
        } catch (ex) {
          expect(ex).toBeInstanceOf(ServiceException);
          expect(ex.errorCode).toBe(ServiceErrorCode.DOES_NOT_EXIST);
          expect(ex.message).toEqual(expect.stringContaining(payrollDisbursementID));
        }
      });
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    beforeEach(() => {
      when(alertService.raiseCriticalAlert(anything())).thenResolve(null);
    });

    it("should raise an Alert AND throw ServiceException with UNKNOWN error if the Payroll is not found", async () => {
      const employerID = uuid();
      const employee: Employee = getRandomEmployee(employerID);
      const payroll: Payroll = getRandomPayroll(employerID).payroll;
      const payrollDisbursement: PayrollDisbursement = getRandomPayrollDisbursement(
        payroll.id,
        employee.id,
      ).payrollDisbursement;

      when(employerService.getDisbursement(payrollDisbursement.id)).thenResolve(payrollDisbursement);
      when(employerService.getPayrollByID(payroll.id)).thenResolve(null);

      try {
        await payrollDepositPreprocessor.convertToRepoInputTransaction({
          disbursementID: payrollDisbursement.id,
        });
        expect(true).toBe(false);
      } catch (ex) {
        expect(ex).toBeInstanceOf(ServiceException);
        expect(ex.errorCode).toBe(ServiceErrorCode.UNKNOWN);
        expect(ex.message).toEqual(expect.stringContaining(payroll.id));

        const [alertPayload] = capture(alertService.raiseCriticalAlert).last();
        expect(alertPayload.key).toBe(AlertKey.POSSIBLE_DATA_CORRUPTION);
        expect(alertPayload.message).toEqual(expect.stringContaining(payroll.id));
      }
    });

    it("should raise an Alert AND throw ServiceException with UNKNOWN error if the Employer is not found", async () => {
      const employer: Employer = getRandomEmployer("Test Employer");
      const employee: Employee = getRandomEmployee(employer.id);
      const payroll: Payroll = getRandomPayroll(employer.id).payroll;
      const payrollDisbursement: PayrollDisbursement = getRandomPayrollDisbursement(
        payroll.id,
        employee.id,
      ).payrollDisbursement;

      when(employerService.getDisbursement(payrollDisbursement.id)).thenResolve(payrollDisbursement);
      when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(employerService.getEmployerByID(employer.id)).thenResolve(null);

      try {
        await payrollDepositPreprocessor.convertToRepoInputTransaction({
          disbursementID: payrollDisbursement.id,
        });
        expect(true).toBe(false);
      } catch (ex) {
        expect(ex).toBeInstanceOf(ServiceException);
        expect(ex.errorCode).toBe(ServiceErrorCode.UNKNOWN);
        expect(ex.message).toEqual(expect.stringContaining(employer.id));

        const [alertPayload] = capture(alertService.raiseCriticalAlert).last();
        expect(alertPayload.key).toBe(AlertKey.POSSIBLE_DATA_CORRUPTION);
        expect(alertPayload.message).toEqual(expect.stringContaining(employer.id));
      }
    });

    it("should raise an Alert AND throw ServiceException with UNKNOWN error if the Employee is not found", async () => {
      const employer: Employer = getRandomEmployer("Test Employer");
      const employee: Employee = getRandomEmployee(employer.id);
      const payroll: Payroll = getRandomPayroll(employer.id).payroll;
      const payrollDisbursement: PayrollDisbursement = getRandomPayrollDisbursement(
        payroll.id,
        employee.id,
      ).payrollDisbursement;

      when(employerService.getDisbursement(payrollDisbursement.id)).thenResolve(payrollDisbursement);
      when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(employerService.getEmployerByID(employer.id)).thenResolve(employer);
      when(employeeService.getEmployeeByID(employee.id)).thenResolve(null);

      try {
        await payrollDepositPreprocessor.convertToRepoInputTransaction({
          disbursementID: payrollDisbursement.id,
        });
        expect(true).toBe(false);
      } catch (ex) {
        expect(ex).toBeInstanceOf(ServiceException);
        expect(ex.errorCode).toBe(ServiceErrorCode.UNKNOWN);
        expect(ex.message).toEqual(expect.stringContaining(employee.id));

        const [alertPayload] = capture(alertService.raiseCriticalAlert).last();
        expect(alertPayload.key).toBe(AlertKey.POSSIBLE_DATA_CORRUPTION);
        expect(alertPayload.message).toEqual(expect.stringContaining(employee.id));
      }
    });

    it("should returns the InputTransaction with proper fields on success", async () => {
      const employer: Employer = getRandomEmployer("Test Employer");
      const employee: Employee = getRandomEmployee(employer.id);
      const payroll: Payroll = getRandomPayroll(employer.id).payroll;
      const payrollDisbursement: PayrollDisbursement = getRandomPayrollDisbursement(
        payroll.id,
        employee.id,
      ).payrollDisbursement;

      when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);
      when(employerService.getDisbursement(payrollDisbursement.id)).thenResolve(payrollDisbursement);
      when(employerService.getEmployerByID(employer.id)).thenResolve(employer);
      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);

      const response: InputTransaction = await payrollDepositPreprocessor.convertToRepoInputTransaction({
        disbursementID: payrollDisbursement.id,
      });

      expect(response).toStrictEqual({
        memo: expect.stringContaining(payroll.payrollDate),
        exchangeRate: payroll.exchangeRate,
        workflowName: WorkflowName.PAYROLL_DEPOSIT,
        transactionRef: expect.any(String),
        debitAmount: payrollDisbursement.allocationAmount,
        debitCurrency: Currency.COP,
        creditAmount: payrollDisbursement.allocationAmount * payroll.exchangeRate,
        creditCurrency: Currency.USD,
        creditConsumerID: employee.consumerID,
        sessionKey: "PAYROLL",
        transactionFees: [],
      });
    });
  });
});
