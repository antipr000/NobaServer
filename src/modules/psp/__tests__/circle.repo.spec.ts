import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { ICircleRepo } from "../repos/CircleRepo";
import { SQLCircleRepo } from "../repos/SQLCircleRepo";
import { getTestWinstonModule } from "src/core/utils/WinstonModule";

describe("CircleRepoTests", () => {
  jest.setTimeout(20000);

  let circleRepo: ICircleRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SQLCircleRepo],
    }).compile();

    circleRepo = app.get<SQLCircleRepo>(SQLCircleRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.cryptoWallet.deleteMany();
    await prismaService.address.deleteMany();
    await prismaService.verification.deleteMany();
    await prismaService.consumer.deleteMany();
    app.close();
  });
});
