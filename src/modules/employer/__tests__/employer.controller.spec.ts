import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { IEmployerRepo } from "../repo/employer.repo";
import { getMockEmployerRepoWithDefaults } from "../mocks/mock.employer.repo";
import { EMPLOYER_REPO_PROVIDER } from "../repo/employer.repo.module";
import { instance, when } from "ts-mockito";
import { EmployerService } from "../employer.service";
import { uuid } from "uuidv4";
import { Employer } from "../domain/Employer";
import { getMockEmployerServiceWithDefaults } from "../mocks/mock.employer.service";
import { EmployerController } from "../employer.controller";
import { NotFoundException } from "@nestjs/common";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    documentNumber: uuid(),
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 5,
    payrollDates: ["2020-03-02T00:00:00Z+0", "2020-02-29T00:00:00Z+0"],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employer;
};

describe("EmployerControllerTests", () => {
  jest.setTimeout(20000);

  let employerRepo: IEmployerRepo;
  let app: TestingModule;
  let employerService: EmployerService;
  let employerController: EmployerController;

  beforeEach(async () => {
    employerRepo = getMockEmployerRepoWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();

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
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        EmployerController,
      ],
    }).compile();

    employerController = app.get<EmployerController>(EmployerController);
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2020-03-01"));
  });

  afterEach(async () => {
    jest.useRealTimers();
    app.close();
  });

  describe("GET /v1/employers/:referralID", () => {
    it("should return the employer by referral ID", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);

      const foundEmployer = await employerController.getEmployerByReferralID(employer.referralID);
      expect(foundEmployer).toEqual({
        employerID: employer.id,
        employerName: employer.name,
        employerLogoURI: employer.logoURI,
        employerReferralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
        documentNumber: employer.documentNumber,
      });
    });

    it("should return maxAllocationPercent when available", async () => {
      const employer: Employer = getRandomEmployer();
      employer.maxAllocationPercent = 20;

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);

      const foundEmployer = await employerController.getEmployerByReferralID(employer.referralID);
      expect(foundEmployer).toEqual({
        employerID: employer.id,
        employerName: employer.name,
        employerLogoURI: employer.logoURI,
        leadDays: employer.leadDays,
        employerReferralID: employer.referralID,
        payrollDates: employer.payrollDates,
        maxAllocationPercent: employer.maxAllocationPercent,
        documentNumber: employer.documentNumber,
      });
    });

    it("should return the employer by referral ID with next payroll date before lead days", async () => {
      const employer: Employer = getRandomEmployer();
      employer.payrollDates = ["2020-04-01", "2020-03-16"];
      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);

      const foundEmployer = await employerController.getEmployerByReferralID(employer.referralID);
      expect(foundEmployer).toEqual({
        employerID: employer.id,
        employerName: employer.name,
        employerLogoURI: employer.logoURI,
        leadDays: employer.leadDays,
        employerReferralID: employer.referralID,
        payrollDates: employer.payrollDates,
        nextPayrollDate: employer.payrollDates[0],
        documentNumber: employer.documentNumber,
      });
    });

    it("should return the employer by referral ID with next payroll date after lead days", async () => {
      const employer: Employer = getRandomEmployer();
      employer.payrollDates = ["2020-03-01", "2020-03-11"];
      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);

      const foundEmployer = await employerController.getEmployerByReferralID(employer.referralID);
      expect(foundEmployer).toEqual({
        employerID: employer.id,
        employerName: employer.name,
        employerLogoURI: employer.logoURI,
        leadDays: employer.leadDays,
        employerReferralID: employer.referralID,
        payrollDates: employer.payrollDates,
        nextPayrollDate: employer.payrollDates[1],
        documentNumber: employer.documentNumber,
      });
    });

    it("should return the employer by referral ID with ascending sort payroll dates", async () => {
      const employer: Employer = getRandomEmployer();
      employer.payrollDates = ["2020-03-11", "2020-03-21", "2020-03-01"];
      const payrollDates = ["2020-03-01", "2020-03-11", "2020-03-21"];
      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);

      const foundEmployer = await employerController.getEmployerByReferralID(employer.referralID);
      expect(foundEmployer).toEqual({
        employerID: employer.id,
        employerName: employer.name,
        employerLogoURI: employer.logoURI,
        employerReferralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: payrollDates,
        nextPayrollDate: employer.payrollDates[1],
        documentNumber: employer.documentNumber,
      });
    });

    it("should throw a 404 if employer is not found", async () => {
      const referralID = "12345";
      when(employerService.getEmployerByReferralID(referralID)).thenResolve(null);

      expect(async () => await employerController.getEmployerByReferralID(referralID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
