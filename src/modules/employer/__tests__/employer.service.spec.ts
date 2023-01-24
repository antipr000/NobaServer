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
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 5,
    paymentSchedules: [1, 15],
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

  beforeEach(async () => {
    employerRepo = getMockEmployerRepoWithDefaults();

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
        paymentSchedules: employer.paymentSchedules,
      });

      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(employerRepo.createEmployer).last();
      expect(propagatedEmployerCreateRequest).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        bubbleID: employer.bubbleID,
        leadDays: employer.leadDays,
        paymentSchedules: employer.paymentSchedules,
      });
    });

    it("should set default 'leadDays' as '1' if not specified", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        paymentSchedules: employer.paymentSchedules,
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
        paymentSchedules: employer.paymentSchedules,
      });
    });

    it("should set default 'paymentSchedule' as '[31]' if not specified", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.createEmployer(anything())).thenResolve(employer);

      const createdEmployer = await employerService.createEmployer({
        name: employer.name,
        logoURI: employer.logoURI,
        bubbleID: employer.bubbleID,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
      });

      employer.paymentSchedules = [31];
      expect(createdEmployer).toEqual(employer);

      const [propagatedEmployerCreateRequest] = capture(employerRepo.createEmployer).last();
      expect(propagatedEmployerCreateRequest).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        bubbleID: employer.bubbleID,
        leadDays: employer.leadDays,
        paymentSchedules: [31],
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
          paymentSchedules: employer.paymentSchedules,
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
        expect(err.message).toEqual(expect.stringContaining("Lead days"));
      }
    });

    it("should throw error if the PaymentSchedule is invalid", async () => {
      const invalidPaymentSchedules: number[][] = [[0], [1, 15, 32], [15, 15], [15, 0]];

      for (const invalidPaymentSchedule of invalidPaymentSchedules) {
        const employer = getRandomEmployer();
        employer.paymentSchedules = invalidPaymentSchedule as any;

        try {
          await employerService.createEmployer({
            name: employer.name,
            logoURI: employer.logoURI,
            bubbleID: employer.bubbleID,
            referralID: employer.referralID,
            leadDays: employer.leadDays,
            paymentSchedules: employer.paymentSchedules,
          });
          expect(true).toBeFalsy();
        } catch (err) {
          expect(err).toBeInstanceOf(ServiceException);
          expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("payment schedules"));
        }
      }
    });
  });

  describe("updateEmployer", () => {
    it("should update 'only' the logoURI of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, employer.logoURI, undefined);

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        logoURI: employer.logoURI,
      });
    });

    it("should update 'only' the referralID of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, undefined, employer.referralID);

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        referralID: employer.referralID,
      });
    });

    it("should update 'both' the referralID & logoURI of the employer", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      const updatedEmployer = await employerService.updateEmployer(employer.id, employer.logoURI, employer.referralID);

      expect(updatedEmployer).toEqual(employer);

      const [employerID, propagatedEmployerUpdateRequest] = capture(employerRepo.updateEmployer).last();
      expect(employerID).toEqual(employer.id);
      expect(propagatedEmployerUpdateRequest).toEqual({
        referralID: employer.referralID,
        logoURI: employer.logoURI,
      });
    });

    it("should throw an error if both the referralID & logoURI are undefined", async () => {
      const employer = getRandomEmployer();
      when(employerRepo.updateEmployer(anything(), anything())).thenResolve(employer);

      try {
        await employerService.updateEmployer(employer.id, undefined, undefined);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("logoURI"));
        expect(err.message).toEqual(expect.stringContaining("referralID"));
      }
    });

    it("should throw ServiceException if the ID is undefined or null", async () => {
      try {
        await employerService.updateEmployer(undefined, "dymmy", "dummy");
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("ID"));
      }

      try {
        await employerService.updateEmployer(null, "dummy", "dummy");
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
