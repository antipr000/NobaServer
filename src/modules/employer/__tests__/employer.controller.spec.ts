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
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 5,
    payrollDays: [1, 15],
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
  });

  afterEach(async () => {
    app.close();
  });

  describe("GET /v1/employers/:referralID", () => {
    it("should return the employer by referral ID", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);

      const foundEmployer = await employerController.getEmployerByReferralID(employer.referralID);
      expect(foundEmployer).toEqual({
        name: employer.name,
        logoURI: employer.logoURI,
        leadDays: employer.leadDays,
        payrollDays: employer.payrollDays,
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
