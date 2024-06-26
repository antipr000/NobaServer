import { Test, TestingModule } from "@nestjs/testing";
import { Employer as PrismaEmployerModel } from "@prisma/client";
import { DatabaseInternalErrorException, NotFoundError } from "../../../core/exception/CommonAppException";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { EmployerCreateRequest } from "../domain/Employer";
import { uuid } from "uuidv4";
import { IEmployerRepo } from "../repo/employer.repo";
import { SqlEmployerRepo } from "../repo/sql.employer.repo";
import { KmsService } from "../../../modules/common/kms.service";
import { instance, when } from "ts-mockito";
import { getMockKMSServiceWithDefaults } from "../../../modules/common/mocks/mock.kms.service";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";
import { AlertService } from "../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../modules/common/mocks/mock.alert.service";

const getAllEmployerRecords = async (prismaService: PrismaService): Promise<PrismaEmployerModel[]> => {
  return prismaService.employer.findMany({});
};

const payrollAccountNumber = "1234567890";
const encryptedPayrollAccountNumber = "[enc]encrypted-acct-num";
const getRandomEmployer = (): EmployerCreateRequest => {
  const employee: EmployerCreateRequest = {
    bubbleID: uuid(),
    name: "Test Employer",
    depositMatchingName: "Deposit Test Employer",
    locale: "en_us",
    referralID: uuid(),
    documentNumber: uuid(),
    logoURI: "https://www.google.com",
    payrollAccountNumber: payrollAccountNumber,
    leadDays: 5,
    payrollDates: ["2020-03-02", "2020-03-01", "2020-02-29"],
  };
  return employee;
};

describe("SqlEmployerRepoTests", () => {
  jest.setTimeout(20000);

  let employerRepo: IEmployerRepo;
  let app: TestingModule;
  let prismaService: PrismaService;
  let kmsService: KmsService;
  let mockAlertService: AlertService;

  beforeAll(async () => {
    kmsService = getMockKMSServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    mockAlertService = getMockAlertServiceWithDefaults();
    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        PrismaService,
        SqlEmployerRepo,
        {
          provide: KmsService,
          useFactory: () => instance(kmsService),
        },
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
        },
      ],
    }).compile();

    employerRepo = app.get<SqlEmployerRepo>(SqlEmployerRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    app.close();
  });

  beforeEach(async () => {
    await prismaService.employer.deleteMany();

    // *****************************  WARNING **********************************
    // *                                                                       *
    // * This can have a potential race condition if the tests run in parallel *
    // *                                                                       *
    // *************************************************************************

    // clear all the dependencies
  });

  describe("createEmployer", () => {
    it("should create a new employer and auto-populate ID, createdTimestamp & updatedTimestamp", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);

      const createdEmployer = await employerRepo.createEmployer(employer);

      expect(createdEmployer).toBeDefined();
      expect(createdEmployer.id).toBeDefined();
      expect(createdEmployer.createdTimestamp).toBeDefined();
      expect(createdEmployer.updatedTimestamp).toBeDefined();
      expect(createdEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(createdEmployer.name).toEqual(employer.name);
      expect(createdEmployer.locale).toEqual(employer.locale);
      expect(createdEmployer.referralID).toEqual(employer.referralID);
      expect(createdEmployer.logoURI).toEqual(employer.logoURI);
      expect(createdEmployer.leadDays).toEqual(employer.leadDays);
      expect(createdEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(createdEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(createdEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(createdEmployer.depositMatchingName).toEqual(employer.depositMatchingName);
      expect(createdEmployer.maxAllocationPercent).toBeUndefined();

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(createdEmployer);
    });

    it("should create a new employer with 'depositMatchingName' as null if not provided", async () => {
      const employer = getRandomEmployer();
      delete employer.depositMatchingName;
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);

      const createdEmployer = await employerRepo.createEmployer(employer);

      expect(createdEmployer).toBeDefined();
      expect(createdEmployer.id).toBeDefined();
      expect(createdEmployer.createdTimestamp).toBeDefined();
      expect(createdEmployer.updatedTimestamp).toBeDefined();
      expect(createdEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(createdEmployer.name).toEqual(employer.name);
      expect(createdEmployer.referralID).toEqual(employer.referralID);
      expect(createdEmployer.logoURI).toEqual(employer.logoURI);
      expect(createdEmployer.leadDays).toEqual(employer.leadDays);
      expect(createdEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(createdEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(createdEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(createdEmployer.depositMatchingName).toBeNull();
      expect(createdEmployer.maxAllocationPercent).toBeUndefined();

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(createdEmployer);
    });

    it("should add maxAllocationPercent if provided", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      employer.maxAllocationPercent = 20;

      const createdEmployer = await employerRepo.createEmployer(employer);

      expect(createdEmployer).toBeDefined();
      expect(createdEmployer.maxAllocationPercent).toBe(20);
    });

    it("should throw an error if the referralID is empty", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      employer.referralID = "";

      try {
        await employerRepo.createEmployer(employer);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("referralID"));
      }
    });

    it("should throw an error if the bubbleID is empty", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      employer.bubbleID = "";

      try {
        await employerRepo.createEmployer(employer);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("bubbleID"));
      }
    });

    it("should throw an error if tried to save an Employer with duplicate referralID", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);

      await employerRepo.createEmployer(employer);

      const anotherEmployerWithSameReferralID = getRandomEmployer();
      anotherEmployerWithSameReferralID.referralID = employer.referralID;
      await expect(employerRepo.createEmployer(anotherEmployerWithSameReferralID)).rejects.toThrowError(
        DatabaseInternalErrorException,
      );
    });

    it("should throw an error if tried to save an Employer with duplicate bubbleID", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);

      await employerRepo.createEmployer(employer);

      const anotherEmployerWithSameBubbleID = getRandomEmployer();
      anotherEmployerWithSameBubbleID.bubbleID = employer.bubbleID;
      await expect(employerRepo.createEmployer(anotherEmployerWithSameBubbleID)).rejects.toThrowError(
        DatabaseInternalErrorException,
      );
    });
  });

  describe("updateEmployer", () => {
    it("should update 'logoURI' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);

      const createdEmployer = await employerRepo.createEmployer(employer);

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        logoURI: "https://www.non-google.com",
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.locale).toEqual(employer.locale);
      expect(updatedEmployer.name).toEqual(employer.name);
      expect(updatedEmployer.referralID).toEqual(employer.referralID);
      expect(updatedEmployer.logoURI).toEqual("https://www.non-google.com");
      expect(updatedEmployer.leadDays).toEqual(employer.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(updatedEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(employer.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update 'maxAllocationPercent' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);
      const createdEmployer = await employerRepo.createEmployer(employer);

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        maxAllocationPercent: 20,
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.name).toEqual(employer.name);
      expect(updatedEmployer.locale).toEqual(employer.locale);
      expect(updatedEmployer.referralID).toEqual(employer.referralID);
      expect(updatedEmployer.logoURI).toEqual(employer.logoURI);
      expect(updatedEmployer.leadDays).toEqual(employer.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(updatedEmployer.maxAllocationPercent).toEqual(20);
      expect(updatedEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(employer.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update 'referralID' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);
      const createdEmployer = await employerRepo.createEmployer(employer);

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        referralID: "new-referral-id",
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.name).toEqual(employer.name);
      expect(updatedEmployer.locale).toEqual(employer.locale);
      expect(updatedEmployer.referralID).toEqual("new-referral-id");
      expect(updatedEmployer.logoURI).toEqual(employer.logoURI);
      expect(updatedEmployer.leadDays).toEqual(employer.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(updatedEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(employer.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update 'leadDays' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);
      const createdEmployer = await employerRepo.createEmployer(employer);

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        leadDays: 3,
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.name).toEqual(employer.name);
      expect(updatedEmployer.locale).toEqual(employer.locale);
      expect(updatedEmployer.referralID).toEqual(employer.referralID);
      expect(updatedEmployer.logoURI).toEqual(employer.logoURI);
      expect(updatedEmployer.leadDays).toEqual(3);
      expect(updatedEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(updatedEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(employer.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update 'payrollDays' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);
      const createdEmployer = await employerRepo.createEmployer(employer);

      const payrollDates = ["2020-03-14", "2020-03-15"];
      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        payrollDates: payrollDates,
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.name).toEqual(employer.name);
      expect(updatedEmployer.locale).toEqual(employer.locale);
      expect(updatedEmployer.referralID).toEqual(employer.referralID);
      expect(updatedEmployer.logoURI).toEqual(employer.logoURI);
      expect(updatedEmployer.leadDays).toEqual(employer.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(payrollDates);
      expect(updatedEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(employer.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update 'payrollAccountNumber' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      const newPayrollAccountNumber = "11111111111";
      const newEncryptedPayrollAccountNumber = "[enc]222222222222";
      when(kmsService.encryptString(newPayrollAccountNumber, KmsKeyType.SSN)).thenResolve(
        newEncryptedPayrollAccountNumber,
      );
      const createdEmployer = await employerRepo.createEmployer(employer);

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        payrollAccountNumber: newPayrollAccountNumber,
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.name).toEqual(employer.name);
      expect(updatedEmployer.locale).toEqual(employer.locale);
      expect(updatedEmployer.referralID).toEqual(employer.referralID);
      expect(updatedEmployer.logoURI).toEqual(employer.logoURI);
      expect(updatedEmployer.leadDays).toEqual(employer.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(newEncryptedPayrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(updatedEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(employer.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update 'name' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      const createdEmployer = await employerRepo.createEmployer(employer);
      const updatedName = "UPDATED NAME";

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        name: updatedName,
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.name).toEqual(updatedName);
      expect(updatedEmployer.referralID).toEqual(employer.referralID);
      expect(updatedEmployer.logoURI).toEqual(employer.logoURI);
      expect(updatedEmployer.leadDays).toEqual(employer.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(employer.payrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(updatedEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(employer.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update 'depositMatchingName' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      const createdEmployer = await employerRepo.createEmployer(employer);
      const updatedDepositMatchingName = "UPDATED DEPOSIT NAME";

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        depositMatchingName: updatedDepositMatchingName,
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.name).toEqual(employer.name);
      expect(updatedEmployer.referralID).toEqual(employer.referralID);
      expect(updatedEmployer.logoURI).toEqual(employer.logoURI);
      expect(updatedEmployer.leadDays).toEqual(employer.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(employer.payrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(updatedEmployer.documentNumber).toEqual(employer.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(updatedDepositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update 'documentNumber' of an existing employer", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      const createdEmployer = await employerRepo.createEmployer(employer);
      const updatedDocumentNumber = uuid();

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer.id, {
        documentNumber: updatedDocumentNumber,
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(employer.bubbleID);
      expect(updatedEmployer.name).toEqual(employer.name);
      expect(updatedEmployer.documentNumber).toEqual(updatedDocumentNumber);
      expect(updatedEmployer.referralID).toEqual(employer.referralID);
      expect(updatedEmployer.logoURI).toEqual(employer.logoURI);
      expect(updatedEmployer.leadDays).toEqual(employer.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(employer.payrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(employer.payrollDates);
      expect(updatedEmployer.depositMatchingName).toEqual(employer.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(1);
      delete allEmployers[0].maxAllocationPercent;
      expect(allEmployers[0]).toEqual(updatedEmployer);
    });

    it("should update all the specified fields of an existing employer", async () => {
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);

      const employer1 = getRandomEmployer();
      const createdEmployer1 = await employerRepo.createEmployer(employer1);
      const employer2 = getRandomEmployer();
      const createdEmployer2 = await employerRepo.createEmployer(employer2);

      const updatedEmployer = await employerRepo.updateEmployer(createdEmployer1.id, {
        referralID: "new-referral-id",
        logoURI: "https://www.non-google.com",
      });

      expect(updatedEmployer).toBeDefined();
      expect(updatedEmployer.id).toBeDefined();
      expect(updatedEmployer.createdTimestamp).toBeDefined();
      expect(updatedEmployer.updatedTimestamp).toBeDefined();
      expect(updatedEmployer.bubbleID).toEqual(createdEmployer1.bubbleID);
      expect(updatedEmployer.name).toEqual(createdEmployer1.name);
      expect(updatedEmployer.locale).toEqual(createdEmployer1.locale);
      expect(updatedEmployer.referralID).toEqual("new-referral-id");
      expect(updatedEmployer.logoURI).toEqual("https://www.non-google.com");
      expect(updatedEmployer.leadDays).toEqual(createdEmployer1.leadDays);
      expect(updatedEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(updatedEmployer.payrollDates).toEqual(createdEmployer1.payrollDates);
      expect(updatedEmployer.documentNumber).toEqual(createdEmployer1.documentNumber);
      expect(updatedEmployer.depositMatchingName).toEqual(createdEmployer1.depositMatchingName);

      const allEmployers = await getAllEmployerRecords(prismaService);
      expect(allEmployers.length).toEqual(2);
      delete allEmployers[0].maxAllocationPercent;
      delete allEmployers[1].maxAllocationPercent;
      expect(allEmployers).toEqual(expect.arrayContaining([updatedEmployer, createdEmployer2]));
    });

    it("should throw exception if updated 'referralID' is a duplicate of another referralID", async () => {
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);

      const employer1 = getRandomEmployer();
      const createdEmployer1 = await employerRepo.createEmployer(employer1);

      const employer2 = getRandomEmployer();
      const createdEmployer2 = await employerRepo.createEmployer(employer2);

      await expect(
        employerRepo.updateEmployer(createdEmployer1.id, {
          referralID: createdEmployer2.referralID,
        }),
      ).rejects.toThrowError(DatabaseInternalErrorException);
    });

    it("should throw NotFoundError if the employerID doesn't really exist", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);

      await employerRepo.createEmployer(employer);

      await expect(
        employerRepo.updateEmployer("non-existing-id", {
          referralID: "new-referral-id",
        }),
      ).rejects.toThrowError(NotFoundError);
    });
  });

  describe("getEmployerByID", () => {
    it("should return the employer with the given ID", async () => {
      const employer1 = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);
      const createdEmployer1 = await employerRepo.createEmployer(employer1);

      const employer2 = getRandomEmployer();
      employer2.leadDays = 13;
      employer2.payrollDates = ["2020-03-13", "2020-04-01"];
      // Add a second employer just to ensure it doesn't get returned
      await employerRepo.createEmployer(employer2);

      const foundEmployer = await employerRepo.getEmployerByID(createdEmployer1.id);

      expect(foundEmployer).toBeDefined();
      expect(foundEmployer.id).toBeDefined();
      expect(foundEmployer.createdTimestamp).toBeDefined();
      expect(foundEmployer.updatedTimestamp).toBeDefined();
      expect(foundEmployer.bubbleID).toEqual(employer1.bubbleID);
      expect(foundEmployer.name).toEqual(employer1.name);
      expect(foundEmployer.locale).toEqual(employer1.locale);
      expect(foundEmployer.referralID).toEqual(employer1.referralID);
      expect(foundEmployer.logoURI).toEqual(employer1.logoURI);
      expect(foundEmployer.leadDays).toEqual(employer1.leadDays);
      expect(foundEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(foundEmployer.payrollDates).toEqual(employer1.payrollDates);
    });

    it("should throw 'null' if the employerID doesn't really exist", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      await employerRepo.createEmployer(employer);

      const foundEmployer = await employerRepo.getEmployerByID("non-existing-id");

      expect(foundEmployer).toBeNull();
    });
  });

  describe("getEmployersByReferralID", () => {
    it("should return the employer with specified referralID", async () => {
      const employer1 = getRandomEmployer();
      const employer2 = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);

      await employerRepo.createEmployer(employer1);
      await employerRepo.createEmployer(employer2);

      const foundEmployer = await employerRepo.getEmployerByReferralID(employer1.referralID);

      expect(foundEmployer).toBeDefined();
      expect(foundEmployer.id).toBeDefined();
      expect(foundEmployer.createdTimestamp).toBeDefined();
      expect(foundEmployer.updatedTimestamp).toBeDefined();
      expect(foundEmployer.bubbleID).toEqual(employer1.bubbleID);
      expect(foundEmployer.name).toEqual(employer1.name);
      expect(foundEmployer.locale).toEqual(employer1.locale);
      expect(foundEmployer.referralID).toEqual(employer1.referralID);
      expect(foundEmployer.logoURI).toEqual(employer1.logoURI);
      expect(foundEmployer.leadDays).toEqual(employer1.leadDays);
      expect(foundEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(foundEmployer.payrollDates).toEqual(employer1.payrollDates);
    });

    it("should throw 'null' if no Employer with referralID doesn't really exist", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      await employerRepo.createEmployer(employer);

      const foundEmployer = await employerRepo.getEmployerByReferralID("non-existing-id");

      expect(foundEmployer).toBeNull();
    });
  });

  describe("getEmployersByBubbleID", () => {
    it("should return the employer with specified bubbleID", async () => {
      const employer1 = getRandomEmployer();
      const employer2 = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN))
        .thenResolve(encryptedPayrollAccountNumber)
        .thenResolve(encryptedPayrollAccountNumber);
      await employerRepo.createEmployer(employer1);
      await employerRepo.createEmployer(employer2);

      const foundEmployer = await employerRepo.getEmployerByBubbleID(employer1.bubbleID);

      expect(foundEmployer).toBeDefined();
      expect(foundEmployer.id).toBeDefined();
      expect(foundEmployer.createdTimestamp).toBeDefined();
      expect(foundEmployer.updatedTimestamp).toBeDefined();
      expect(foundEmployer.bubbleID).toEqual(employer1.bubbleID);
      expect(foundEmployer.name).toEqual(employer1.name);
      expect(foundEmployer.locale).toEqual(employer1.locale);
      expect(foundEmployer.referralID).toEqual(employer1.referralID);
      expect(foundEmployer.logoURI).toEqual(employer1.logoURI);
      expect(foundEmployer.leadDays).toEqual(employer1.leadDays);
      expect(foundEmployer.payrollAccountNumber).toEqual(encryptedPayrollAccountNumber);
      expect(foundEmployer.payrollDates).toEqual(employer1.payrollDates);
    });

    it("should throw 'null' if no Employer with bubbleID doesn't really exist", async () => {
      const employer = getRandomEmployer();
      when(kmsService.encryptString(payrollAccountNumber, KmsKeyType.SSN)).thenResolve(encryptedPayrollAccountNumber);
      await employerRepo.createEmployer(employer);

      const foundEmployer = await employerRepo.getEmployerByBubbleID("non-existing-id");

      expect(foundEmployer).toBeNull();
    });
  });
});
