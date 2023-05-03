import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { MonoWebhookController } from "../mono.webhook.controller";
import { MonoWebhookService } from "../mono.webhook.service";
import { getMockMonoWebhookServiceWithDefaults } from "../mocks/mock.mono.webhook.service";

describe("MonoWebhookControllerTests", () => {
  jest.setTimeout(20000);

  let monoWebhookController: MonoWebhookController;
  let monoWebhookService: MonoWebhookService;
  let app: TestingModule;

  beforeEach(async () => {
    monoWebhookService = getMockMonoWebhookServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: MonoWebhookService,
          useFactory: () => instance(monoWebhookService),
        },
        MonoWebhookController,
      ],
    }).compile();

    monoWebhookController = app.get<MonoWebhookController>(MonoWebhookController);
  });

  afterEach(async () => {
    app.close();
  });

  describe("processWebhookRequests", () => {
    it("should forward the request & headers to the service as is", async () => {
      when(monoWebhookService.processWebhookEvent(anything(), anyString())).thenResolve();

      const requestBody = { some: "requestBody" };
      const monoSignature = "monoSignature";

      await monoWebhookController.processWebhookRequests(requestBody, monoSignature);

      const [propagatedRequestBody, propagatedMonoSignature] = capture(monoWebhookService.processWebhookEvent).last();
      expect(propagatedRequestBody).toEqual(requestBody);
      expect(propagatedMonoSignature).toEqual(monoSignature);
    });
  });
});
