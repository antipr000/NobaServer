import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { EmployerService } from "../employer.service";
import { uuid } from "uuidv4";
import { Employer } from "../domain/Employer";
import { getMockEmployerServiceWithDefaults } from "../mocks/mock.employer.service";
import { EmployerWorkflowController } from "../employer.workflow.controller";
import { EmployerWithEmployeesDTO } from "../dto/employer.service.dto";
import { getRandomEmployee } from "../../../modules/employee/test_utils/employee.test.utils";

const getRandomEmployer = (): EmployerWithEmployeesDTO => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 5,
    payrollDates: ["2020-03-02T00:00:00Z+0", "2020-02-29T00:00:00Z+0"],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  const employee1 = getRandomEmployee(employer.id);
  const employee2 = getRandomEmployee(employer.id);
  return {
    ...employer,
    employees: [employee1, employee2],
  };
};

describe("EmployerWorkflowControllerTests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let employerService: EmployerService;
  let employerWorkflowController: EmployerWorkflowController;

  beforeEach(async () => {
    employerService = getMockEmployerServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        EmployerWorkflowController,
      ],
    }).compile();

    employerWorkflowController = app.get<EmployerWorkflowController>(EmployerWorkflowController);
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2020-03-01"));
  });

  afterEach(async () => {
    jest.useRealTimers();
    app.close();
  });

  describe("getEmployer", () => {
    it("should return the employer by referral ID with ascending sort payroll dates", async () => {
      const employer: EmployerWithEmployeesDTO = getRandomEmployer();
      employer.payrollDates = ["2020-03-11", "2020-03-21", "2020-03-01"];
      const payrollDates = ["2020-03-01", "2020-03-11", "2020-03-21"];
      when(employerService.getEmployerWithEmployees(employer.id, true)).thenResolve(employer);

      const foundEmployer = await employerWorkflowController.getEmployer(employer.id, true);

      expect(foundEmployer).toEqual({
        employerID: employer.id,
        employerName: employer.name,
        employerLogoURI: employer.logoURI,
        employerReferralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: payrollDates,
        nextPayrollDate: employer.payrollDates[1],
        employees: employer.employees.map(employee => ({
          id: employee.id,
          allocationAmount: employee.allocationAmount,
          allocationCurrency: employee.allocationCurrency,
          employerID: employee.employerID,
          consumerID: employee.consumerID,
          ...(employee.salary && { salary: employee.salary }),
        })),
      });
    });
  });
});
