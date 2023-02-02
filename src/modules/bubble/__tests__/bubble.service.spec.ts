import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { uuid } from "uuidv4";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Employer } from "../../../modules/employer/domain/Employer";
import { Employee, EmployeeAllocationCurrency } from "../../../modules/employee/domain/Employee";
import { EmployerService } from "../../../modules/employer/employer.service";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { BubbleService } from "../bubble.service";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { BubbleClient } from "../bubble.client";
import { getMockBubbleClientWithDefaults } from "../mocks/mock.bubble.client";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 1,
    payrollDates: [new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employer;
};

const getRandomEmployee = (consumerID: string, employerID: string): Employee => {
  const employee: Employee = {
    id: uuid(),
    employerID: employerID,
    consumerID: consumerID,
    allocationAmount: Math.floor(Math.random() * 1000000),
    allocationCurrency: EmployeeAllocationCurrency.COP,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employee;
};

const getRandomConsumer = (): Consumer => {
  const consumer = Consumer.createConsumer({
    id: uuid(),
    email: `${uuid()}@noba.com`,
  });
  return consumer;
};

describe("BubbleServiceTests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let employerService: EmployerService;
  let employeeService: EmployeeService;
  let bubbleService: BubbleService;
  let bubbleClient: BubbleClient;

  beforeEach(async () => {
    employerService = getMockEmployerServiceWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();
    bubbleClient = getMockBubbleClientWithDefaults();

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
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: BubbleClient,
          useFactory: () => instance(bubbleClient),
        },
        BubbleService,
      ],
    }).compile();

    bubbleService = app.get<BubbleService>(BubbleService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("createEmployeeInBubble", () => {
    it("should create an employee in a bubble", async () => {
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer.id);

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(employerService.getEmployerByID(employer.id)).thenResolve(employer);
      when(bubbleClient.registerNewEmployee(anything())).thenResolve();

      await bubbleService.createEmployeeInBubble(employee.id, consumer);

      const [bubbleClientCreateEmployeeArgs] = capture(bubbleClient.registerNewEmployee).last();
      expect(bubbleClientCreateEmployeeArgs).toEqual({
        email: consumer.props.email,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        phone: consumer.props.phone,
        employerReferralID: employer.referralID,
        nobaEmployeeID: employee.id,
        allocationAmountInPesos: employee.allocationAmount,
      });
    });

    it("should throw ServiceException if the 'allocationCurrency' is not 'COP'", async () => {
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer.id);
      employee.allocationCurrency = "USD" as EmployeeAllocationCurrency;

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);

      try {
        await bubbleService.createEmployeeInBubble(employee.id, consumer);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("COP"));
        expect(err.message).toEqual(expect.stringContaining("'allocationCurrency'"));
      }
    });
  });

  describe("registerEmployerInNoba", () => {
    it("should register an employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
        payrollDates: employer.payrollDates,
      });
    });

    it("shouldn't forward 'leadDays' if not set in the request to register an employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        payrollDates: employer.payrollDates,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        payrollDates: employer.payrollDates,
      });
    });

    it("shouldn't forward 'payrollDays' if not set in the request to register an employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
        leadDays: employer.leadDays,
      });
    });

    it("shouldn't forward both 'leadDays' & 'payrollDays' if they are not set in the request to register an employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();

      when(employerService.createEmployer(anything())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
      });

      expect(result).toEqual(employer.id);

      const [propagatedEmployerToEmployerService] = capture(employerService.createEmployer).last();
      expect(propagatedEmployerToEmployerService).toEqual({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
      });
    });
  });

  describe("updateEmployeeAllocationInBubble", () => {
    it("should forwards the request to BubbleClient as is", async () => {
      const employer = getRandomEmployer();
      const consumer = getRandomConsumer();
      const employee = getRandomEmployee(consumer.props.id, employer.id);
      const newAllocationAmount = 12345;

      when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
      when(bubbleClient.updateEmployeeAllocationAmount(employee.id, newAllocationAmount)).thenResolve();

      await bubbleService.updateEmployeeAllocationInBubble(employee.id, newAllocationAmount);

      const [
        bubbleClientUpdateEmployeeAllocationAmountArgsEmployeeID,
        bubbleClientUpdateEmployeeAllocationAmountArgsNewAllocationAmount,
      ] = capture(bubbleClient.updateEmployeeAllocationAmount).last();
      expect(bubbleClientUpdateEmployeeAllocationAmountArgsEmployeeID).toEqual(employee.id);
      expect(bubbleClientUpdateEmployeeAllocationAmountArgsNewAllocationAmount).toEqual(newAllocationAmount);
    });
  });

  describe("updateEmployerInNoba", () => {
    it("should update the 'leadDays' of employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();
      const updatedLeadDays = 10;

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.updateEmployer(anyString(), anything())).thenResolve();

      await bubbleService.updateEmployerInNoba(employer.referralID, { leadDays: updatedLeadDays });

      const [propagatedEmployerIDToEmployerService, propagatedLeadDaysToEmployerService] = capture(
        employerService.updateEmployer,
      ).last();
      expect(propagatedEmployerIDToEmployerService).toEqual(employer.id);
      expect(propagatedLeadDaysToEmployerService).toEqual({ leadDays: updatedLeadDays });
    });

    it("should update the 'payrollDays' of employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();
      const updatedPayrollDates = [
        new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
      ];

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.updateEmployer(anyString(), anything())).thenResolve();

      await bubbleService.updateEmployerInNoba(employer.referralID, { payrollDates: updatedPayrollDates });

      const [propagatedEmployerIDToEmployerService, propagatedLeadDaysToEmployerService] = capture(
        employerService.updateEmployer,
      ).last();
      expect(propagatedEmployerIDToEmployerService).toEqual(employer.id);
      expect(propagatedLeadDaysToEmployerService).toEqual({ payrollDates: updatedPayrollDates });
    });

    it("should update the 'logoURI' of employer in Noba", async () => {
      const employer: Employer = getRandomEmployer();
      const updatedLogoURI = "new-logo-uri";

      when(employerService.getEmployerByReferralID(employer.referralID)).thenResolve(employer);
      when(employerService.updateEmployer(anyString(), anything())).thenResolve();

      await bubbleService.updateEmployerInNoba(employer.referralID, { logoURI: updatedLogoURI });

      const [propagatedEmployerIDToEmployerService, propagatedLeadDaysToEmployerService] = capture(
        employerService.updateEmployer,
      ).last();
      expect(propagatedEmployerIDToEmployerService).toEqual(employer.id);
      expect(propagatedLeadDaysToEmployerService).toEqual({ logoURI: updatedLogoURI });
    });

    it("should throw error if 'referralID' is not linked with an existing Employer", async () => {
      const invalidReferralID = "invalid-referral-id";
      when(employerService.getEmployerByReferralID(invalidReferralID)).thenResolve(null);

      try {
        await bubbleService.updateEmployerInNoba(invalidReferralID, { logoURI: "updatedLogoURI" });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toEqual(ServiceErrorCode.DOES_NOT_EXIST);
        expect(err.message).toEqual(expect.stringContaining("No employer found"));
      }
    });
  });
});
