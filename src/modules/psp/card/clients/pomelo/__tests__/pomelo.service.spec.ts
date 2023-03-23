import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../../core/utils/WinstonModule";
import { PomeloRepo } from "../repos/pomelo.repo";
import { PomeloService } from "../pomelo.service";
import { LocationService } from "../../../../../common/location.service";
import { getMockPomeloRepoWithDefaults } from "../mocks/mock.pomelo.repo";
import { getMockLocationServiceWithDefaults } from "../../../../../common/mocks/mock.location.service";
import { ConsumerService } from "../../../../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../../../consumer/mocks/mock.consumer.service";
import { POMELO_REPO_PROVIDER } from "../repos/pomelo.repo.module";
import { instance } from "ts-mockito";

describe("PomeloServiceTests", () => {
  jest.setTimeout(20000);

  let pomeloService: PomeloService;
  let pomeloRepo: PomeloRepo;
  let locationService: LocationService;
  let consumerService: ConsumerService;

  let app: TestingModule;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    pomeloRepo = getMockPomeloRepoWithDefaults();
    locationService = getMockLocationServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: POMELO_REPO_PROVIDER,
          useFactory: () => instance(pomeloRepo),
        },
        {
          provide: LocationService,
          useFactory: () => instance(locationService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        PomeloService,
      ],
    }).compile();

    pomeloService = app.get<PomeloService>(PomeloService);
  });

  afterAll(async () => {
    app.close();
  });

  describe("createCard", async () => {});
});
