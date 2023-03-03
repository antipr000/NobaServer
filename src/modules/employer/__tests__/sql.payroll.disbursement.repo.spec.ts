import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import {
  getRandomPayrollDisbursement,
  saveAndGetPayroll,
  saveAndGetPayrollDisbursement,
} from "../test_utils/payroll.test.utils";
import { DatabaseInternalErrorException } from "../../../core/exception/CommonAppException";
import { IPayrollDisbursementRepo } from "../repo/payroll.disbursement.repo";
import { SqlPayrollDisbursementRepo } from "../repo/sql.payroll.disbursement.repo";
import { saveAndGetEmployee } from "../../employee/test_utils/employee.test.utils";
import { createTestNobaTransaction } from "../../transaction/test_utils/test.utils";

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
        },
      );

      delete updatedPayrollDisbursement.updatedTimestamp;
      delete payrollDisbursement.updatedTimestamp;

      expect(updatedPayrollDisbursement).toStrictEqual({
        ...payrollDisbursement,
        transactionID: transactionID,
      });
    });

    it("should throw error if transaction with id does not exist", async () => {
      const payrollDisbursement = await saveAndGetPayrollDisbursement(prismaService);

      await expect(
        async () =>
          await payrollDisbursementRepo.updatePayrollDisbursement(payrollDisbursement.id, {
            transactionID: "fake-transaction-id",
          }),
      ).rejects.toThrow(DatabaseInternalErrorException);
    });

    it("should throw error if payroll disbursement does not exist", async () => {
      const transactionID = await createTestNobaTransaction(prismaService);

      await expect(
        async () =>
          await payrollDisbursementRepo.updatePayrollDisbursement("fake-id", {
            transactionID: transactionID,
          }),
      ).rejects.toThrow(DatabaseInternalErrorException);
    });
  });

  describe("getPayrollDisbursementById", () => {
    it("should get the requested payroll disbursement", async () => {
      const payrollDisbursement = await saveAndGetPayrollDisbursement(prismaService);

      const retrivedPayrollDisbursement = await payrollDisbursementRepo.getPayrollDisbursementByID(
        payrollDisbursement.id,
      );
      expect(retrivedPayrollDisbursement).toStrictEqual(payrollDisbursement);
    });

    it("should return null when payroll disbursement is not found", async () => {
      const retrievedPayrollDisbursement = await payrollDisbursementRepo.getPayrollDisbursementByID("fake-id");

      expect(retrievedPayrollDisbursement).toBeNull();
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
});
