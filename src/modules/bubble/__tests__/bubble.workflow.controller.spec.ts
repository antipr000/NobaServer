import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { BubbleWorkflowController } from "../bubble.workflow.controller";
import { BubbleService } from "../bubble.service";
import { getMockBubbleServiceWithDefaults } from "../mocks/mock.bubble.service";

describe("BubbleWorkflowControllerTests", () => {
  jest.setTimeout(20000);

  let bubbleWorkflowController: BubbleWorkflowController;
  let bubbleService: BubbleService;
  let app: TestingModule;

  beforeEach(async () => {
    bubbleService = getMockBubbleServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: BubbleService,
          useFactory: () => instance(bubbleService),
        },
        BubbleWorkflowController,
      ],
    }).compile();

    bubbleWorkflowController = app.get<BubbleWorkflowController>(BubbleWorkflowController);
  });

  afterEach(async () => {
    app.close();
  });

  describe("registerEmployer", () => {
    it("should forwards the request to the BubbleService", async () => {
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
      };
      when(bubbleService.registerEmployerInNoba(anything())).thenResolve("nobaEmployerID");

      const result = await bubbleWorkflowController.registerEmployer(requestBody);

      expect(result.nobaEmployerID).toEqual("nobaEmployerID");

      const [bubbleServiceRegisterEmployerInNobaArgs] = capture(bubbleService.registerEmployerInNoba).last();
      expect(bubbleServiceRegisterEmployerInNobaArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
      });
    });

    it("should forwards the 'leadDays' in request to the BubbleService", async () => {
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        leadDays: 5,
      };
      when(bubbleService.registerEmployerInNoba(anything())).thenResolve("nobaEmployerID");

      const result = await bubbleWorkflowController.registerEmployer(requestBody);

      expect(result.nobaEmployerID).toEqual("nobaEmployerID");

      const [bubbleServiceRegisterEmployerInNobaArgs] = capture(bubbleService.registerEmployerInNoba).last();
      expect(bubbleServiceRegisterEmployerInNobaArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        leadDays: 5,
      });
    });

    it("should forwards the 'maxAllocationPercent' in request to the BubbleService", async () => {
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        leadDays: 5,
        maxAllocationPercent: 10,
      };
      when(bubbleService.registerEmployerInNoba(anything())).thenResolve("nobaEmployerID");

      const result = await bubbleWorkflowController.registerEmployer(requestBody);

      expect(result.nobaEmployerID).toEqual("nobaEmployerID");

      const [bubbleServiceRegisterEmployerInNobaArgs] = capture(bubbleService.registerEmployerInNoba).last();
      expect(bubbleServiceRegisterEmployerInNobaArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        leadDays: 5,
        maxAllocationPercent: 10,
      });
    });

    it("should forward the 'payrollDates' in request to the BubbleService", async () => {
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        payrollDates: ["2020-03-01"],
      };
      when(bubbleService.registerEmployerInNoba(anything())).thenResolve("nobaEmployerID");

      const result = await bubbleWorkflowController.registerEmployer(requestBody);

      expect(result.nobaEmployerID).toEqual("nobaEmployerID");

      const [bubbleServiceRegisterEmployerInNobaArgs] = capture(bubbleService.registerEmployerInNoba).last();
      expect(bubbleServiceRegisterEmployerInNobaArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        referralID: "referralID",
        payrollDates: requestBody.payrollDates,
      });
    });
  });

  describe("updateEmployer", () => {
    it("should forwards the request to the BubbleService", async () => {
      const referralID = "referralID";
      const requestBody = {
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        maxAllocationPercent: 10,
      };
      when(bubbleService.updateEmployerInNoba(anyString(), anything())).thenResolve();

      await bubbleWorkflowController.updateEmployer(requestBody, referralID);

      const [bubbleServiceUpdateEmployerInNobaReferralIDArgs, bubbleServiceUpdateEmployerInNobaRequestBodyArgs] =
        capture(bubbleService.updateEmployerInNoba).last();
      expect(bubbleServiceUpdateEmployerInNobaReferralIDArgs).toEqual("referralID");
      expect(bubbleServiceUpdateEmployerInNobaRequestBodyArgs).toEqual({
        bubbleID: "bubbleID",
        logoURI: "logoURI",
        name: "name",
        maxAllocationPercent: 10,
      });
    });
  });

  describe("updateEmployee", () => {
    it("should forwards the request to the BubbleService", async () => {
      const employeeID = "employeeID";
      const requestBody = {
        salary: 1000,
      };

      when(bubbleService.updateEmployee(anyString(), anything())).thenResolve();

      await bubbleWorkflowController.updateEmployee(requestBody, employeeID);

      const [bubbleServiceUpdateEmployeeEmployeeIDArgs, bubbleServiceUpdateEmployeeRequestBodyArgs] = capture(
        bubbleService.updateEmployee,
      ).last();
      expect(bubbleServiceUpdateEmployeeEmployeeIDArgs).toEqual("employeeID");
      expect(bubbleServiceUpdateEmployeeRequestBodyArgs).toEqual({
        salary: 1000,
      });
    });
  });
});
