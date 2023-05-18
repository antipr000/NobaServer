import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { getMockMetaClientWithDefaults } from "../mocks/mock.meta.client";
import { instance, when } from "ts-mockito";
import { MetaService } from "../meta.service";
import { MetaClient } from "../meta.client";
import { MetaEvent, MetaEventName } from "../../dto/meta.service.dto";

describe("MetaServiceTests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let metaService: MetaService;
  let metaClient: MetaClient;

  beforeAll(async () => {
    metaClient = getMockMetaClientWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: MetaClient,
          useFactory: () => instance(metaClient),
        },
        MetaService,
      ],
    }).compile();

    metaService = app.get<MetaService>(MetaService);
  });

  afterAll(async () => {
    app.close();
  });

  describe("raiseEvent", () => {
    it("should raise the event successfully", async () => {
      const event: MetaEvent = {
        eventName: MetaEventName.COMPLETE_REGISTRATION,
        userData: {
          id: "123456789",
          email: "rosie@noba.com",
          phone: "123456789",
          firstName: "Rosie",
          lastName: "Noba",
          country: "US",
        },
      };
      when(metaClient.raiseEvent(event)).thenResolve();

      await metaService.raiseEvent(event);
    });

    it("should get an exception but not re-throw it", async () => {
      const event: MetaEvent = {
        eventName: MetaEventName.COMPLETE_REGISTRATION,
        userData: {
          id: "123456789",
          email: "rosie@noba.com",
          phone: "123456789",
          firstName: "Rosie",
          lastName: "Noba",
          country: "US",
        },
      };
      when(metaClient.raiseEvent(event)).thenThrow(new Error("Test Error"));

      await metaService.raiseEvent(event);
    });
  });
});
