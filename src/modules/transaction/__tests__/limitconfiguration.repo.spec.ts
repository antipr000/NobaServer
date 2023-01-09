import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { LimitConfiguration } from "../domain/LimitConfiguration";
import { ILimitConfigurationRepo } from "../repo/limit.configuration.repo";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { SQLLimitConfigurationRepo } from "../repo/sql.limit.configuration.repo";
import { uuid } from "uuidv4";
import { TransactionType } from "@prisma/client";

describe("LimitConfigurationRepo tests", () => {
  jest.setTimeout(20000);

  let limitConfigurationRepo: ILimitConfigurationRepo;
  let prismaService: PrismaService;
  let app: TestingModule;

  beforeEach(async () => {
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    /**
     *
     * This will be used to configure the testing module and will decouple
     * the testing module from the actual module.
     *
     * Never hard-code the environment variables "KEY_NAME" in the testing module.
     * All the keys used in 'appconfigs' are defined in
     * `config/ConfigurationUtils` and it should be used for all the testing modules.
     *
     **/
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [SQLLimitConfigurationRepo, PrismaService],
    }).compile();

    limitConfigurationRepo = app.get<SQLLimitConfigurationRepo>(SQLLimitConfigurationRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.limitConfiguration.deleteMany();
    await prismaService.limitProfile.deleteMany();
    await app.close();
  });

  describe("addLimitConfig", () => {
    it("should add a limit configuration", async () => {
      const config1 = createLimitConfiguration(1);
      const response = await limitConfigurationRepo.addLimitConfig(config1);
      expect(response.props).toMatchObject(config1.props);
    });
  });

  describe("getAllLimitConfigs", () => {
    it("should get all limit configurations sorted by priority in reverse oder", async () => {
      const config1 = createLimitConfiguration(2);
      const config2 = createLimitConfiguration(5);
      const config3 = createLimitConfiguration(1);

      // add the configs to repo
      await limitConfigurationRepo.addLimitConfig(config1);
      await limitConfigurationRepo.addLimitConfig(config2);
      await limitConfigurationRepo.addLimitConfig(config3);

      // get all limit configs and assert they are in order of priority
      const response = await limitConfigurationRepo.getAllLimitConfigs();

      expect(response).toHaveLength(3);
      expect(response[0].props.priority).toBe(5);
      expect(response[1].props.priority).toBe(2);
      expect(response[2].props.priority).toBe(1);
    });
  });

  describe("getLimitConfig", () => {
    it("should return limit configuration when present", async () => {
      const config1 = createLimitConfiguration(1);
      await limitConfigurationRepo.addLimitConfig(config1);

      const response = await limitConfigurationRepo.getLimitConfig(config1.props.id);
      expect(response.props).toMatchObject(config1.props);
    });

    it("should return null when limit configuration is not present", async () => {
      const response = await limitConfigurationRepo.getLimitConfig("fake-config-1");
      expect(response).toBe(null);
    });
  });
});

function createLimitConfiguration(priority: number): LimitConfiguration {
  return LimitConfiguration.createLimitConfiguration({
    id: `${uuid()}_${new Date().valueOf()}`,
    isDefault: false,
    priority: priority,
    profileID: "fake-profile-1",
    transactionType: TransactionType.NOBA_WALLET,
    minProfileAge: 365,
    minBalanceInWallet: 100,
    minTotalTransactionAmount: 1000,
  });
}
