import { Test, TestingModule } from "@nestjs/testing";
import { IPayrollRepo } from "../repo/payroll.repo";
import { SqlPayrollRepo } from "../repo/sql.payroll.repo";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import {
  getRandomPayroll,
  saveAndGetPayroll,
  savePayrollWithDebitAmountAndStatus,
} from "../test_utils/payroll.test.utils";
import { createTestEmployerAndStoreInDB } from "../test_utils/test.utils";
import { Payroll, PayrollStatus } from "../domain/Payroll";
import { DatabaseInternalErrorException, NotFoundError } from "../../../core/exception/CommonAppException";
import { uuid } from "uuidv4";
import { getRandomEmployer, saveAndGetEmployer, saveEmployer } from "../test_utils/employer.test.utils";
import { Employer } from "../domain/Employer";

describe("SqlPayrollRepo tests", () => {
  jest.setTimeout(20000);
  let payrollRepo: IPayrollRepo;

  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SqlPayrollRepo],
    }).compile();

    payrollRepo = app.get<SqlPayrollRepo>(SqlPayrollRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.employer.deleteMany();
  });

  describe("addPayroll", () => {
    it("should create payroll", async () => {
      const employerID = await createTestEmployerAndStoreInDB(prismaService);
      const { payrollCreateInput } = getRandomPayroll(employerID);

      const createResponse = await payrollRepo.addPayroll(payrollCreateInput);

      expect(createResponse).toBeDefined();
      expect(createResponse.id).toBeDefined();
      expect(createResponse).toEqual(expect.objectContaining(payrollCreateInput));
      expect(createResponse.status).toBe(PayrollStatus.CREATED);
    });

    it("should create payroll when currency, amount and exchangeRate details are missing", async () => {
      const employerID = await createTestEmployerAndStoreInDB(prismaService);
      const { payrollCreateInput } = getRandomPayroll(employerID);

      delete payrollCreateInput.creditCurrency;
      delete payrollCreateInput.debitCurrency;
      delete payrollCreateInput.totalCreditAmount;
      delete payrollCreateInput.totalDebitAmount;
      delete payrollCreateInput.exchangeRate;

      const createResponse = await payrollRepo.addPayroll(payrollCreateInput);

      expect(createResponse).toBeDefined();
      expect(createResponse.id).toBeDefined();
      expect(createResponse).toEqual(expect.objectContaining(payrollCreateInput));
      expect(createResponse.status).toBe(PayrollStatus.CREATED);
    });

    it("should throw error when employer does not exist", async () => {
      const { payrollCreateInput } = getRandomPayroll("fake-employer");
      expect(async () => await payrollRepo.addPayroll(payrollCreateInput)).rejects.toThrow(
        DatabaseInternalErrorException,
      );
      await expect(async () => await payrollRepo.addPayroll(payrollCreateInput)).rejects.toThrow(
        DatabaseInternalErrorException,
      );
      await expect(async () => await payrollRepo.addPayroll(payrollCreateInput)).rejects.toThrow(
        "Failed to store Payroll in database as employer with id fake-employer was not found",
      );
    });

    it("should throw error when payload is not proper", async () => {
      const employerID = await createTestEmployerAndStoreInDB(prismaService);
      const { payrollCreateInput } = getRandomPayroll(employerID);

      delete payrollCreateInput.payrollDate; // payrollDate is a required field

      await expect(async () => await payrollRepo.addPayroll(payrollCreateInput)).rejects.toThrow(Error);
    });
  });

  describe("updatePayroll", () => {
    it("should update payroll status and completed time", async () => {
      const payroll = await saveAndGetPayroll(prismaService);

      const updatedPayroll = await payrollRepo.updatePayroll(payroll.id, {
        status: PayrollStatus.COMPLETED,
        completedTimestamp: new Date(),
      });

      expect(updatedPayroll.status).toBe(PayrollStatus.COMPLETED);
      expect(updatedPayroll.id).toBe(payroll.id);
      expect(updatedPayroll.completedTimestamp).not.toBeNull();
    });

    it("should update paymentMonoTransactionID", async () => {
      const payroll = await saveAndGetPayroll(prismaService);
      const updatedTransactionID = uuid();

      const updatedPayroll = await payrollRepo.updatePayroll(payroll.id, {
        paymentMonoTransactionID: updatedTransactionID,
      });

      expect(updatedPayroll).toStrictEqual({
        id: payroll.id,
        employerID: payroll.employerID,
        referenceNumber: payroll.referenceNumber,
        payrollDate: payroll.payrollDate,
        totalDebitAmount: payroll.totalDebitAmount,
        totalCreditAmount: payroll.totalCreditAmount,
        exchangeRate: payroll.exchangeRate,
        debitCurrency: payroll.debitCurrency,
        creditCurrency: payroll.creditCurrency,
        paymentMonoTransactionID: updatedTransactionID,
        status: PayrollStatus.CREATED,
        createdTimestamp: expect.any(Date),
        updatedTimestamp: expect.any(Date),
        completedTimestamp: expect.any(Date),
      });
    });

    it("should throw error if status is not valid", async () => {
      const payroll = await saveAndGetPayroll(prismaService);

      await expect(
        async () =>
          await payrollRepo.updatePayroll(payroll.id, {
            status: "Completed" as any,
            completedTimestamp: new Date(),
          }),
      ).rejects.toThrow(Error);
    });

    it("should throw error if payroll does not exist", async () => {
      await expect(
        async () =>
          await payrollRepo.updatePayroll("fake-id", {
            status: PayrollStatus.COMPLETED,
            completedTimestamp: new Date(),
          }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("getPayrollById", () => {
    it("should get the requested payroll", async () => {
      const payroll = await saveAndGetPayroll(prismaService);

      const retrievedPayroll = await payrollRepo.getPayrollByID(payroll.id);

      expect(retrievedPayroll).toStrictEqual(payroll);
    });

    it("should return null when payroll is not found", async () => {
      const retrievedPayroll = await payrollRepo.getPayrollByID("fake-id");

      expect(retrievedPayroll).toBeNull();
    });
  });

  describe("getAllPayrollsForEmployer", () => {
    it("should get all payrolls for employer", async () => {
      const payroll1 = await saveAndGetPayroll(prismaService);
      const payroll2 = await saveAndGetPayroll(prismaService, payroll1.employerID);

      const allPayrolls = await payrollRepo.getAllPayrollsForEmployer(payroll1.employerID, {});

      expect(allPayrolls).toHaveLength(2);
      expect(allPayrolls).toEqual(expect.arrayContaining([payroll1, payroll2]));
    });

    it("should return all completed payrolls for employer", async () => {
      let payroll1 = await saveAndGetPayroll(prismaService);
      await saveAndGetPayroll(prismaService, payroll1.employerID);
      let payroll3 = await saveAndGetPayroll(prismaService, payroll1.employerID);
      await saveAndGetPayroll(prismaService);

      // Set status
      payroll1 = await payrollRepo.updatePayroll(payroll1.id, { status: PayrollStatus.COMPLETED });
      payroll3 = await payrollRepo.updatePayroll(payroll3.id, { status: PayrollStatus.COMPLETED });

      const allPayrolls = await payrollRepo.getAllPayrollsForEmployer(payroll1.employerID, {
        status: PayrollStatus.COMPLETED,
      });
      expect(allPayrolls).toHaveLength(2);
      expect(allPayrolls).toEqual(expect.arrayContaining([payroll1, payroll3]));
    });

    it("should return empty list when employer is not present", async () => {
      const payroll1 = await saveAndGetPayroll(prismaService);
      await saveAndGetPayroll(prismaService, payroll1.employerID);

      const allPayrolls = await payrollRepo.getAllPayrollsForEmployer("fake-id", {});

      expect(allPayrolls).toHaveLength(0);
    });
  });

  describe("getPayrollMatchingAmountAndEmployerDocumentNumber", () => {
    describe("'All' INVOICED payrolls", () => {
      it("should return empty array if no 'debitAmount' matches but 'documentNumber' is null", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        delete employer1.documentNumber;
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDocumentNumber(123456, uuid());

        expect(queriedPayrolls).toHaveLength(0);
      });

      it("should return empty array if no 'debitAmount' doesn't matches but 'documentNumber' matches", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.documentNumber = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.documentNumber = employer1.documentNumber;
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDocumentNumber(
          123456,
          employer1.documentNumber,
        );

        expect(queriedPayrolls).toHaveLength(0);
      });

      it("should return empty array if 'debitAmount' matches with record1 but 'documentNumber' matches with record2", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.documentNumber = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.documentNumber = uuid();
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDocumentNumber(
          123456,
          employer1.documentNumber,
        );

        expect(queriedPayrolls).toHaveLength(0);
      });

      it("should return matching 'single' record if 'debitAmount' matches and 'documentNumber' matches", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.documentNumber = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.documentNumber = uuid();
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDocumentNumber(
          123456,
          employer2.documentNumber,
        );

        expect(queriedPayrolls).toHaveLength(1);
        expect(queriedPayrolls[0]).toStrictEqual(payroll2);
      });

      it("should return matching 'multiple' record if 'debitAmount' matches and 'documentNumber' matches", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.documentNumber = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.documentNumber = employer1.documentNumber;
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll3: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDocumentNumber(
          123456,
          employer2.documentNumber,
        );

        expect(queriedPayrolls).toHaveLength(2);
        expect(queriedPayrolls).toContainEqual(payroll2);
        expect(queriedPayrolls).toContainEqual(payroll1);
      });
    });

    describe("INVOICED + Other Payrolls", () => {
      it("should return empty array if 'debitAmount' matches and 'documentNumber' matches but status is not INVOICED", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.documentNumber = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.documentNumber = employer1.documentNumber;
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.CREATED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDocumentNumber(
          123456,
          employer2.documentNumber,
        );

        expect(queriedPayrolls).toHaveLength(0);
      });

      it("should filter the non-INVOICED payrolls and return matching 'multiple' payrolls if 'debitAmount' matches and 'documentNumber' matches", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.documentNumber = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.documentNumber = uuid();
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.CREATED,
          prismaService,
        );
        const payroll3: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll4: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll5: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDocumentNumber(
          654321,
          employer1.documentNumber,
        );

        expect(queriedPayrolls).toHaveLength(2);
        expect(queriedPayrolls).toContainEqual(payroll3);
        expect(queriedPayrolls).toContainEqual(payroll1);
      });
    });
  });

  describe("getPayrollMatchingAmountAndEmployerDepositMatchingName", () => {
    describe("'All' INVOICED payrolls", () => {
      it("should return empty array if no 'debitAmount' matches but 'depositMatchingName' is null", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        delete employer1.depositMatchingName;
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDepositMatchingName(
          123456,
          uuid(),
        );

        expect(queriedPayrolls).toHaveLength(0);
      });

      it("should return empty array if no 'debitAmount' doesn't matches but 'depositMatchingName' matches", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.depositMatchingName = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.depositMatchingName = employer1.depositMatchingName;
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDepositMatchingName(
          123456,
          employer1.depositMatchingName,
        );

        expect(queriedPayrolls).toHaveLength(0);
      });

      it("should return empty array if 'debitAmount' matches with record1 but 'depositMatchingName' matches with record2", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.depositMatchingName = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.depositMatchingName = uuid();
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDepositMatchingName(
          123456,
          employer1.depositMatchingName,
        );

        expect(queriedPayrolls).toHaveLength(0);
      });

      it("should return matching 'single' record if 'debitAmount' matches and 'depositMatchingName' matches", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.depositMatchingName = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.depositMatchingName = uuid();
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDepositMatchingName(
          123456,
          employer2.depositMatchingName,
        );

        expect(queriedPayrolls).toHaveLength(1);
        expect(queriedPayrolls[0]).toStrictEqual(payroll2);
      });

      it("should return matching 'multiple' record if 'debitAmount' matches and 'depositMatchingName' matches", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.depositMatchingName = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.depositMatchingName = employer1.depositMatchingName;
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll3: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDepositMatchingName(
          123456,
          employer2.depositMatchingName,
        );

        expect(queriedPayrolls).toHaveLength(2);
        expect(queriedPayrolls).toContainEqual(payroll2);
        expect(queriedPayrolls).toContainEqual(payroll1);
      });
    });

    describe("INVOICED + Other Payrolls", () => {
      it("should return empty array if 'debitAmount' matches and 'depositMatchingName' matches but status is not INVOICED", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.depositMatchingName = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.depositMatchingName = employer1.depositMatchingName;
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          123456,
          PayrollStatus.CREATED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDepositMatchingName(
          123456,
          employer2.depositMatchingName,
        );

        expect(queriedPayrolls).toHaveLength(0);
      });

      it("should filter the non-INVOICED payrolls and return matching 'multiple' payrolls if 'debitAmount' matches and 'depositMatchingName' matches", async () => {
        const employer1: Employer = getRandomEmployer("EMPLOYEE_1");
        employer1.depositMatchingName = uuid();
        await saveEmployer(employer1, prismaService);
        const employer2: Employer = getRandomEmployer("EMPLOYEE_1");
        employer2.depositMatchingName = uuid();
        await saveEmployer(employer2, prismaService);

        const payroll1: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll2: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.CREATED,
          prismaService,
        );
        const payroll3: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer1.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll4: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );
        const payroll5: Payroll = await savePayrollWithDebitAmountAndStatus(
          employer2.id,
          654321,
          PayrollStatus.INVOICED,
          prismaService,
        );

        const queriedPayrolls = await payrollRepo.getPayrollMatchingAmountAndEmployerDepositMatchingName(
          654321,
          employer1.depositMatchingName,
        );

        expect(queriedPayrolls).toHaveLength(2);
        expect(queriedPayrolls).toContainEqual(payroll3);
        expect(queriedPayrolls).toContainEqual(payroll1);
      });
    });
  });
});
