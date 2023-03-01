import { Test, TestingModule } from "@nestjs/testing";
import { IPayrollRepo } from "../repo/payroll.repo";
import { SqlPayrollRepo } from "../repo/sql.payroll.repo";
import { PrismaService } from "../../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { getRandomPayroll, saveAndGetPayroll } from "../test_utils/payroll.test.utils";
import { createTestEmployerAndStoreInDB } from "../../test_utils/test.utils";
import { PayrollStatus } from "../domain/Payroll";
import { DatabaseInternalErrorException } from "../../../../core/exception/CommonAppException";

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

      delete payrollCreateInput.reference; // Reference is a required field

      await expect(async () => await payrollRepo.addPayroll(payrollCreateInput)).rejects.toThrow(Error);
    });
  });

  describe("updatePayroll", () => {
    it("should update payroll status and completed time", async () => {
      const payroll = await saveAndGetPayroll(prismaService);

      const updatedPayroll = await payrollRepo.updatePayroll(payroll.id, {
        status: PayrollStatus.COMPLETE,
        completedTimestamp: new Date(),
      });

      expect(updatedPayroll.status).toBe(PayrollStatus.COMPLETE);
      expect(updatedPayroll.id).toBe(payroll.id);
      expect(updatedPayroll.completedTimestamp).not.toBeNull();
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
      payroll1 = await payrollRepo.updatePayroll(payroll1.id, { status: PayrollStatus.COMPLETE });
      payroll3 = await payrollRepo.updatePayroll(payroll3.id, { status: PayrollStatus.COMPLETE });

      const allPayrolls = await payrollRepo.getAllPayrollsForEmployer(payroll1.employerID, {
        status: PayrollStatus.COMPLETE,
      });
      expect(allPayrolls).toHaveLength(2);
      expect(allPayrolls).toEqual(expect.arrayContaining([payroll1, payroll3]));
    });
  });
});
