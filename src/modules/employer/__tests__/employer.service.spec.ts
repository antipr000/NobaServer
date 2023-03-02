import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { IEmployerRepo } from "../repo/employer.repo";
import { getMockEmployerRepoWithDefaults } from "../mocks/mock.employer.repo";
import { EMPLOYER_REPO_PROVIDER } from "../repo/employer.repo.module";
import { anything, capture, instance, when } from "ts-mockito";
import { EmployerService } from "../employer.service";
import { uuid } from "uuidv4";
import { Employer } from "../domain/Employer";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 5,
    payrollDates: ["2020-02-05", "2020-03-25"],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employer;
};

describe("EmployerServiceTests", () => {
  jest.setTimeout(20000);

  let employerRepo: IEmployerRepo;
  let app: TestingModule;
  let employerService: EmployerService;
  let employeeService: EmployeeService;

  beforeEach(async () => {
    employerRepo = getMockEmployerRepoWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EMPLOYER_REPO_PROVIDER,
          useFactory: () => instance(employerRepo),
        },
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        EmployerService,
      ],
    }).compile();

    employerService = app.get<EmployerService>(EmployerService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("createEmployer", () => {
    it("should create an employer and 'always' send the 'COP' as allocationCurrency", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
      });

      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(employerRepo.createEmployer).last();
      expect(propagatedEmployerCreateRequest).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        bubbleID: employer.bubbleID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
      });
    });

    it("should create an employer with provided maxAllocationPercent", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
        maxAllocationPercent: employer.maxAllocationPercent,
      });

      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(employerRepo.createEmployer).last();
      expect(propagatedEmployerCreateRequest).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        bubbleID: employer.bubbleID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
        maxAllocationPercent: employer.maxAllocationPercent,
      });
    });

    it("should create an employer with no payroll dates", async () => {
      const employer = getRandomEmployer();
      delete employer.payrollDates;
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
      });

      expect(createdEmployer).toEqual(employer);
    });

    it("should create an employer with empty payroll dates", async () => {
      const employer = getRandomEmployer();
      employer.payrollDates = [];
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
      });

      expect(createdEmployer).toEqual(employer);
    });

    it("should set default 'leadDays' as '1' if not specified", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        payrollDates: employer.payrollDates,
      });

      employer.leadDays = 1;
      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(employerRepo.createEmployer).last();
      expect(propagatedEmployerCreateRequest).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        bubbleID: employer.bubbleID,
        leadDays: 1,
        payrollDates: employer.payrollDates,
      });
    });

    const invalidLeadDays = [0, -1, 6, 10];
    test.each(invalidLeadDays)("should throw ServiceException if leadDays is set to: %s", async invalidLeadDay => {
      const employer = getRandomEmployer();
      employer.leadDays = invalidLeadDay;

      try {
        await employerService.createEmployer({
          name: employer.name,
          logoURI: employer.logoURI,
          bubbleID: employer.bubbleID,
          referralID: employer.referralID,
          leadDays: employer.leadDays,
          payrollDates: employer.payrollDates,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
        expect(err.message).toEqual(expect.stringContaining("Lead days"));
      }
    });
  });

  describe("updateEmployer", () => {
    it("should update 'only' the logoURI of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        logoURI: "https://new-logo-uri.com",
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        logoURI: "https://new-logo-uri.com",
      });
    });

    it("should update 'only' the maxAllocationPercent of the employer", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        maxAllocationPercent: 20,
      });

      expect(updatedEmployer).toEqual(employer);
      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        maxAllocationPercent: 20,
      });
    });

    it("should update 'only' the referralID of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        referralID: "new-referral-id",
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        referralID: "new-referral-id",
      });
    });

    it("should update 'only' the leadDays of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        leadDays: 4,
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        leadDays: 4,
      });
    });

    const invalidLeadDays = [0, -1, 6, 10];
    test.each(invalidLeadDays)("should throw ServiceException if leadDays is set to: %s", async invalidLeadDay => {
      const employer = getRandomEmployer();
      employer.leadDays = invalidLeadDay;

      try {
        const updatedEmployer = await employerService.updateEmployer(employer.id, {
          leadDays: invalidLeadDay,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
        expect(err.message).toEqual(expect.stringContaining("Lead days"));
      }
    });

    it("should update 'only' the payrollDays of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const payrollDates = ["2020-03-04", "2020-03-18"];
      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        payrollDates: payrollDates,
      });

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        payrollDates: payrollDates,
      });
    });

    it("should update all the fields", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const payrollDates = ["2020-03-17", "2020-03-30"];
      const updatedEmployer = await employerService.updateEmployer(employer.id, {
        logoURI: "https://new-logo-uri.com",
        referralID: "new-referral-id",
        leadDays: 4,
        payrollDates: payrollDates,
        maxAllocationPercent: 20,
      });

      expect(updatedEmployer).toStrictEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        logoURI: "https://new-logo-uri.com",
        referralID: "new-referral-id",
        leadDays: 4,
        payrollDates: payrollDates,
        maxAllocationPercent: 20,
      });
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      try {
        await employerService.updateEmployer(undefined, {
          logoURI: "https://new-logo-uri.com",
          referralID: "new-referral-id",
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("ID"));
      }

      try {
        await employerService.updateEmployer(null, {
          logoURI: "https://new-logo-uri.com",
          referralID: "new-referral-id",
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("ID"));
      }
    });
  });

  describe("getEmployerByID", () => {
    it("should get an employer by ID", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.id);

      expect(retrievedEmployer).toEqual(employer);

      const [employerID] = capture(employerRepo.getEmployerByID).last();
      expect(employerID).toEqual(employer.id);
      expect(retrievedEmployer.maxAllocationPercent).toBeUndefined();
    });

    it("should return 'maxAllocationPercent' when available", async () => {
      const employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;
      when(employerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.id);

      expect(retrievedEmployer).toEqual(employer);

      const [employerID] = capture(employerRepo.getEmployerByID).last();
      expect(employerID).toEqual(employer.id);
      expect(retrievedEmployer.maxAllocationPercent).toBe(20);
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employerService.getEmployerByID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employerService.getEmployerByID(null)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getEmployerByReferralID", () => {
    it("should get an employer by ID", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.referralID);

      expect(retrievedEmployer).toEqual(employer);

      const [referralID] = capture(employerRepo.getEmployerByID).last();
      expect(referralID).toEqual(employer.referralID);
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employerService.getEmployerByID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employerService.getEmployerByID(null)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getEmployerByBubbleID", () => {
    it("should get an employer by ID", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.getEmployerByID(anything())).thenResolve(employer);

      const retrievedEmployer = await employerService.getEmployerByID(employer.bubbleID);

      expect(retrievedEmployer).toEqual(employer);

      const [bubbleID] = capture(employerRepo.getEmployerByID).last();
      expect(bubbleID).toEqual(employer.bubbleID);
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      await expect(employerService.getEmployerByID(undefined)).rejects.toThrowError(ServiceException);

      await expect(employerService.getEmployerByID(null)).rejects.toThrowError(ServiceException);
    });
  });
});
