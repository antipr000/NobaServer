import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { EmployerService } from "../employer.service";
import { Employer } from "../domain/Employer";
import { getMockEmployerServiceWithDefaults } from "../mocks/mock.employer.service";
import { EmployerWorkflowController } from "../employer.workflow.controller";
import { getRandomEmployee } from "../../../modules/employee/test_utils/employee.test.utils";
import { createTestEmployer } from "../test_utils/test.utils";
import { Employee, EmployeeStatus } from "../../../modules/employee/domain/Employee";

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
      const sortedPayrollDates = ["2020-03-01", "2020-03-11", "2020-03-21"];

      const employer: Employer = createTestEmployer();
      employer.payrollDates = ["2020-03-11", "2020-03-21", "2020-03-01"];

      when(employerService.getEmployerByID(employer.id)).thenResolve(employer);

      const receivedEmployer = await employerWorkflowController.getEmployer(employer.id);

      expect(receivedEmployer).toEqual({
        employerID: employer.id,
        employerName: employer.name,
        employerLogoURI: employer.logoURI,
        locale: employer.locale,
        employerReferralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: sortedPayrollDates,
        nextPayrollDate: employer.payrollDates[1],
      });
    });
  });

  describe("getAllEmployees", () => {
    it("should return all the employes for specified employerID", async () => {
      const employer: Employer = createTestEmployer();
      const employee1: Employee = getRandomEmployee(employer.id);
      const employee2: Employee = getRandomEmployee(employer.id);
      employee2.salary = 10;

      when(employerService.getAllEmployees(employer.id)).thenResolve([employee1, employee2]);

      const receivedEmployees = await employerWorkflowController.getAllEmployees(employer.id);

      expect(receivedEmployees).toEqual({
        employees: [
          {
            id: employee1.id,
            allocationAmount: employee1.allocationAmount,
            allocationCurrency: employee1.allocationCurrency,
            employerID: employer.id,
            consumerID: employee1.consumerID,
            status: EmployeeStatus.LINKED,
          },
          {
            id: employee2.id,
            allocationAmount: employee2.allocationAmount,
            allocationCurrency: employee2.allocationCurrency,
            employerID: employer.id,
            consumerID: employee2.consumerID,
            salary: 10,
            status: EmployeeStatus.LINKED,
          },
        ],
      });
    });
  });
});
