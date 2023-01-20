import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { uuid } from "uuidv4";
import { ServiceException } from "../../../core/exception/ServiceException";
import { Employer } from "../../../modules/employer/domain/Employer";
import { Employee, EmployeeAllocationCurrency } from "../../../modules/employee/domain/Employee";
import { EmployerService } from "../../../modules/employer/employer.service";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { BubbleService } from "../buuble.service";
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
  let consumerService: ConsumerService;
  let bubbleService: BubbleService;
  let bubbleClient: BubbleClient;

  beforeEach(async () => {
    employerService = getMockEmployerServiceWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
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
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
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
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(bubbleClient.registerNewEmployee(anything())).thenResolve();

      await bubbleService.createEmployeeInBubble(employee.id);

      const [bubbleClientCreateEmployeeArgs] = capture(bubbleClient.registerNewEmployee).last();
      expect(bubbleClientCreateEmployeeArgs).toEqual({
        email: consumer.props.email,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        phone: consumer.props.phone,
        employerID: employee.employerID,
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
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      try {
        await bubbleService.createEmployeeInBubble(employee.id);
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

      when(employerService.createEmployer(anyString(), anyString(), anyString(), anyString())).thenResolve(employer);

      const result = await bubbleService.registerEmployerInNoba({
        name: employer.name,
        bubbleID: employer.bubbleID,
        logoURI: employer.logoURI,
        referralID: employer.referralID,
      });

      expect(result).toEqual(employer.id);

      const [
        employerServiceCreateEmployerArgsName,
        employerServiceCreateEmployerArgsLogoURI,
        employerServiceCreateEmployerArgsReferralID,
        employerServiceCreateEmployerArgsBubbleID,
      ] = capture(employerService.createEmployer).last();
      expect(employerServiceCreateEmployerArgsName).toEqual(employer.name);
      expect(employerServiceCreateEmployerArgsBubbleID).toEqual(employer.bubbleID);
      expect(employerServiceCreateEmployerArgsLogoURI).toEqual(employer.logoURI);
      expect(employerServiceCreateEmployerArgsReferralID).toEqual(employer.referralID);
    });
  });
});
