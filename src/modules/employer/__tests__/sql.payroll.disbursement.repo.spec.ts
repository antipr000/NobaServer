import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import {
  getRandomPayrollDisbursement,
  saveAndGetPayroll,
  saveAndGetPayrollDisbursement,
  updatePayrollWithTransactionID,
} from "../test_utils/payroll.test.utils";
import { DatabaseInternalErrorException } from "../../../core/exception/CommonAppException";
import { IPayrollDisbursementRepo } from "../repo/payroll.disbursement.repo";
import { SqlPayrollDisbursementRepo } from "../repo/sql.payroll.disbursement.repo";
import { createEmployee, saveAndGetEmployee } from "../../employee/test_utils/employee.test.utils";
import { createTestNobaTransaction, createTransaction } from "../../transaction/test_utils/test.utils";
import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { createTestEmployerAndStoreInDB } from "../test_utils/test.utils";
import { Employee, EmployeeCreateRequest } from "../../../modules/employee/domain/Employee";
import { getRandomEmployee } from "../../employee/test_utils/employee.test.utils";
import { TransactionStatus } from "../../../modules/transaction/domain/Transaction";

describe("SqlPayrollDisbursementRepo tests", () => {
  jest.setTimeout(20000);
  let payrollDisbursementRepo: IPayrollDisbursementRepo;

  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SqlPayrollDisbursementRepo],
    }).compile();

    payrollDisbursementRepo = app.get<SqlPayrollDisbursementRepo>(SqlPayrollDisbursementRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.employee.deleteMany();
    await prismaService.employer.deleteMany();
  });

  describe("addPayrollDisbursement", () => {
    it("should create payroll disbursement", async () => {
      const payroll = await saveAndGetPayroll(prismaService);
      const employee = await saveAndGetEmployee(prismaService);
      const { payrollDisbursementCreateInput } = getRandomPayrollDisbursement(payroll.id, employee.id);

      const savedPayrollDisbursement = await payrollDisbursementRepo.createPayrollDisbursement(
        payrollDisbursementCreateInput,
      );

      expect(savedPayrollDisbursement).toEqual(expect.objectContaining(payrollDisbursementCreateInput));
    });

    it("should throw error when employee does not exist", async () => {
      const payroll = await saveAndGetPayroll(prismaService);
      const { payrollDisbursementCreateInput } = getRandomPayrollDisbursement(payroll.id, "fake-employee-id");

      await expect(
        async () => await payrollDisbursementRepo.createPayrollDisbursement(payrollDisbursementCreateInput),
      ).rejects.toThrow(DatabaseInternalErrorException);
    });

    it("should throw error when payroll does not exist", async () => {
      const employee = await saveAndGetEmployee(prismaService);
      const { payrollDisbursementCreateInput } = getRandomPayrollDisbursement("fake-payroll", employee.id);
      await expect(
        async () => await payrollDisbursementRepo.createPayrollDisbursement(payrollDisbursementCreateInput),
      ).rejects.toThrow(DatabaseInternalErrorException);
    });
  });

  describe("updatePayrollDisbursement", () => {
    it("should update payroll disbursement transaction id", async () => {
      const transactionID = await createTestNobaTransaction(prismaService);
      const payrollDisbursement = await saveAndGetPayrollDisbursement(prismaService);

      const updatedPayrollDisbursement = await payrollDisbursementRepo.updatePayrollDisbursement(
        payrollDisbursement.id,
        {
          transactionID: transactionID,
          creditAmount: 1000,
        },
      );

      delete updatedPayrollDisbursement.updatedTimestamp;
      delete payrollDisbursement.updatedTimestamp;

      expect(updatedPayrollDisbursement).toStrictEqual({
        ...payrollDisbursement,
        transactionID: transactionID,
        creditAmount: 1000,
      });
    });

    it("should throw error if transaction with id does not exist", async () => {
      const payrollDisbursement = await saveAndGetPayrollDisbursement(prismaService);

      await expect(
        async () =>
          await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement.id, {
            transactionID: "fake-transaction-id",
            creditAmount: 1000,
          }),
      ).rejects.toThrow(DatabaseInternalErrorException);
    });

    it("should throw error if payroll disbursement does not exist", async () => {
      const transactionID = await createTestNobaTransaction(prismaService);

      await expect(
        async () =>
          await payrollDisbursementRepo.updatePayrollDisbursement("fake-id", {
            transactionID: transactionID,
            creditAmount: 1000,
          }),
      ).rejects.toThrow(DatabaseInternalErrorException);
    });
  });

  describe("getPayrollDisbursementById", () => {
    it("should get the requested payroll disbursement", async () => {
      const payrollDisbursement = await saveAndGetPayrollDisbursement(prismaService);

      const retrievedPayrollDisbursement = await payrollDisbursementRepo.getPayrollDisbursementByID(
        payrollDisbursement.id,
      );
      expect(retrievedPayrollDisbursement).toStrictEqual(payrollDisbursement);
    });

    it("should return null when payroll disbursement is not found", async () => {
      const retrievedPayrollDisbursement = await payrollDisbursementRepo.getPayrollDisbursementByID("fake-id");

      expect(retrievedPayrollDisbursement).toBeNull();
    });
  });

  describe("getPayrollDisbursementByTransactionID", () => {
    it("should get the requested payroll disbursement", async () => {
      const transactionID = await createTestNobaTransaction(prismaService);
      const payrollDisbursement = await saveAndGetPayrollDisbursement(prismaService);
      const updatedPayrollDisbursement = await updatePayrollWithTransactionID(
        prismaService,
        payrollDisbursement.id,
        transactionID,
      );

      const retrievedPayrollDisbursement = await payrollDisbursementRepo.getPayrollDisbursementByTransactionID(
        updatedPayrollDisbursement.transactionID,
      );
      expect(retrievedPayrollDisbursement).toStrictEqual(updatedPayrollDisbursement);
    });

    it("should return null when payroll disbursement is not found", async () => {
      const retrievedPayrollDisbursement = await payrollDisbursementRepo.getPayrollDisbursementByTransactionID(
        "fake-id",
      );

      expect(retrievedPayrollDisbursement).toBeNull();
    });
  });

  describe("getFilteredEnrichedDisbursementsForPayroll", () => {
    it("should get all enriched disbursements for payroll", async () => {
      const consumerID1: string = await createTestConsumer(prismaService, "Barry", "Allen");
      const consumerID2: string = await createTestConsumer(prismaService, "Bruce", "Wayne");
      const consumerID3: string = await createTestConsumer(prismaService, "Clark", "Kent");
      const consumerID4: string = await createTestConsumer(prismaService, "Diana", "Prince");
      const consumerID5: string = await createTestConsumer(prismaService, "Diego", "Forlan");
      const consumerID6: string = await createTestConsumer(prismaService, "Diego", "Maradona");
      const consumerID7: string = await createTestConsumer(prismaService, "Juan Danial", "Hoyon Castro");

      const employerID1: string = await createTestEmployerAndStoreInDB(prismaService);
      const employerID2: string = await createTestEmployerAndStoreInDB(prismaService);

      const employee1: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID1);
      const employeeID1 = await createEmployee(prismaService, employee1);
      const employee2: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID2);
      const employeeID2 = await createEmployee(prismaService, employee2);
      const employee3: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID3);
      const employeeID3 = await createEmployee(prismaService, employee3);
      const employee4: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID4);
      const employeeID4 = await createEmployee(prismaService, employee4);
      const employee5: EmployeeCreateRequest = getRandomEmployee(employerID1, consumerID5);
      const employeeID5 = await createEmployee(prismaService, employee5);
      const employee6: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID6);
      const employeeID6 = await createEmployee(prismaService, employee6);
      const employee7: EmployeeCreateRequest = getRandomEmployee(employerID2, consumerID7);
      const employeeID7 = await createEmployee(prismaService, employee7);

      const payroll1 = await saveAndGetPayroll(prismaService, employerID1);
      const payroll2 = await saveAndGetPayroll(prismaService, employerID2);

      const { payrollDisbursementCreateInput: payrollDisbursementCreateInput1 } = getRandomPayrollDisbursement(
        payroll1.id,
        employeeID1,
      );
      const payrollDisbursement1 = await payrollDisbursementRepo.createPayrollDisbursement(
        payrollDisbursementCreateInput1,
      );
      const { payrollDisbursementCreateInput: payrollDisbursementCreateInput2 } = getRandomPayrollDisbursement(
        payroll1.id,
        employeeID2,
      );
      const payrollDisbursement2 = await payrollDisbursementRepo.createPayrollDisbursement(
        payrollDisbursementCreateInput2,
      );
      const { payrollDisbursementCreateInput: payrollDisbursementCreateInput3 } = getRandomPayrollDisbursement(
        payroll1.id,
        employeeID3,
      );
      const payrollDisbursement3 = await payrollDisbursementRepo.createPayrollDisbursement(
        payrollDisbursementCreateInput3,
      );
      const { payrollDisbursementCreateInput: payrollDisbursementCreateInput4 } = getRandomPayrollDisbursement(
        payroll1.id,
        employeeID4,
      );
      const payrollDisbursement4 = await payrollDisbursementRepo.createPayrollDisbursement(
        payrollDisbursementCreateInput4,
      );
      const { payrollDisbursementCreateInput: payrollDisbursementCreateInput5 } = getRandomPayrollDisbursement(
        payroll1.id,
        employeeID5,
      );
      const payrollDisbursement5 = await payrollDisbursementRepo.createPayrollDisbursement(
        payrollDisbursementCreateInput5,
      );
      const { payrollDisbursementCreateInput: payrollDisbursementCreateInput6 } = getRandomPayrollDisbursement(
        payroll2.id,
        employeeID6,
      );
      const payrollDisbursement6 = await payrollDisbursementRepo.createPayrollDisbursement(
        payrollDisbursementCreateInput6,
      );
      const { payrollDisbursementCreateInput: payrollDisbursementCreateInput7 } = getRandomPayrollDisbursement(
        payroll2.id,
        employeeID7,
      );
      const payrollDisbursement7 = await payrollDisbursementRepo.createPayrollDisbursement(
        payrollDisbursementCreateInput7,
      );

      const transactionID1 = await createTransaction({
        prismaService,
        consumerID: consumerID1,
        status: TransactionStatus.PROCESSING,
      });
      await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement1.id, {
        transactionID: transactionID1,
        creditAmount: 1000,
      });
      const transactionID2 = await createTransaction({
        prismaService,
        consumerID: consumerID2,
        status: TransactionStatus.COMPLETED,
      });
      await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement2.id, {
        transactionID: transactionID2,
        creditAmount: 2000,
      });
      const transactionID3 = await createTransaction({
        prismaService,
        consumerID: consumerID3,
        status: TransactionStatus.FAILED,
      });
      await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement3.id, {
        transactionID: transactionID3,
        creditAmount: 3000,
      });
      const transactionID4 = await createTransaction({
        prismaService,
        consumerID: consumerID4,
        status: TransactionStatus.COMPLETED,
      });
      await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement4.id, {
        transactionID: transactionID4,
        creditAmount: 4000,
      });
      const transactionID5 = await createTransaction({
        prismaService,
        consumerID: consumerID5,
        status: TransactionStatus.EXPIRED,
      });
      await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement5.id, {
        transactionID: transactionID5,
        creditAmount: 5000,
      });
      const transactionID6 = await createTransaction({
        prismaService,
        consumerID: consumerID6,
        status: TransactionStatus.INITIATED,
      });
      await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement6.id, {
        transactionID: transactionID6,
        creditAmount: 6000,
      });
      const transactionID7 = await createTransaction({
        prismaService,
        consumerID: consumerID7,
        status: TransactionStatus.PROCESSING,
      });
      await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement7.id, {
        transactionID: transactionID7,
        creditAmount: 7000,
      });

      const enrichedDisbursementsPayroll1NoFilter =
        await payrollDisbursementRepo.getFilteredEnrichedDisbursementsForPayroll(payroll1.id, {});
      expect(enrichedDisbursementsPayroll1NoFilter.totalItems).toBe(5);
      expect(
        enrichedDisbursementsPayroll1NoFilter.items.filter(item => item.status === TransactionStatus.COMPLETED),
      ).toHaveLength(2);

      const enrichedDisbursementsPayroll2NoFiler =
        await payrollDisbursementRepo.getFilteredEnrichedDisbursementsForPayroll(payroll2.id, {});
      expect(enrichedDisbursementsPayroll2NoFiler.totalItems).toBe(2);
      expect(
        enrichedDisbursementsPayroll2NoFiler.items.filter(item => item.status === TransactionStatus.COMPLETED),
      ).toHaveLength(0);

      const enrichedDisbursementsPayroll1FilterByStatus =
        await payrollDisbursementRepo.getFilteredEnrichedDisbursementsForPayroll(payroll1.id, {
          status: TransactionStatus.PROCESSING,
        });
      expect(enrichedDisbursementsPayroll1FilterByStatus.totalItems).toBe(1);

      const enrichedDisbursementsPayroll2FilterByStatus =
        await payrollDisbursementRepo.getFilteredEnrichedDisbursementsForPayroll(payroll2.id, {
          status: TransactionStatus.PROCESSING,
        });
      expect(enrichedDisbursementsPayroll2FilterByStatus.totalItems).toBe(1);
    });
  });

  describe("getAllDisbursementsForEmployee", () => {
    it("should get all disbursements for employee", async () => {
      const payrollDisbursement = await saveAndGetPayrollDisbursement(prismaService);

      const allDisbursementsForEmployee = await payrollDisbursementRepo.getAllDisbursementsForEmployee(
        payrollDisbursement.employeeID,
      );

      expect(allDisbursementsForEmployee).toHaveLength(1);
      expect(allDisbursementsForEmployee).toEqual(expect.arrayContaining(allDisbursementsForEmployee));
    });

    it("should return empty list if employee with id does not exist", async () => {
      await saveAndGetPayrollDisbursement(prismaService);

      const allDisbursementsForEmployee = await payrollDisbursementRepo.getAllDisbursementsForEmployee(
        "fake-employee-id",
      );

      expect(allDisbursementsForEmployee).toHaveLength(0);
    });
  });

  describe("getAllDisbursementsForPayroll", () => {
    it("should get all disbursements for payroll", async () => {
      const payrollDisbursement = await saveAndGetPayrollDisbursement(prismaService);

      const allDisbursementsForPayroll = await payrollDisbursementRepo.getAllDisbursementsForPayroll(
        payrollDisbursement.payrollID,
      );

      expect(allDisbursementsForPayroll).toHaveLength(1);
      expect(allDisbursementsForPayroll).toEqual(expect.arrayContaining(allDisbursementsForPayroll));
    });

    it("should return empty list if payroll with id does not exist", async () => {
      await saveAndGetPayrollDisbursement(prismaService);

      const allDisbursementsForPayroll = await payrollDisbursementRepo.getAllDisbursementsForPayroll("fake-payroll-id");

      expect(allDisbursementsForPayroll).toHaveLength(0);
    });
  });
});
