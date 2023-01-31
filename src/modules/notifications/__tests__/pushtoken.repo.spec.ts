import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { v4 } from "uuid";
import { Utils } from "../../../core/utils/Utils";
import { IPushTokenRepo } from "../repos/pushtoken.repo";
import { SQLPushTokenRepo } from "../repos/sql.pushtoken.repo";

describe("PushtokenRepoTests", () => {
  jest.setTimeout(20000);

  let pushTokenRepo: IPushTokenRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SQLPushTokenRepo],
    }).compile();

    pushTokenRepo = app.get<SQLPushTokenRepo>(SQLPushTokenRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.pushToken.deleteMany();
    app.close();
  });

  describe("getPushToken", () => {});
});
