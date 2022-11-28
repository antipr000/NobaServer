import { Test, TestingModule } from "@nestjs/testing";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { LimitConfiguration } from "../domain/LimitConfiguration";
import { TransactionType } from "../domain/Types";
import { ILimitConfigurationRepo } from "../repo/LimitConfigurationRepo";
import { MongoDBLimitConfigurationRepo } from "../repo/MongoDBLimitConfigurationRepo";

describe("MongoDBLimitConfigurationRepo", () => {
  jest.setTimeout(20000);

  let limitConfigurationRepo: ILimitConfigurationRepo;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;

  beforeEach(async () => {
    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log("MongoMemoryServer running at: ", mongoUri);

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
      [MONGO_CONFIG_KEY]: {
        [MONGO_URI]: mongoUri,
      },
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [DBProvider, MongoDBLimitConfigurationRepo],
    }).compile();

    limitConfigurationRepo = app.get<MongoDBLimitConfigurationRepo>(MongoDBLimitConfigurationRepo);

    mongoClient = new MongoClient(mongoUri);

    await mongoClient.connect();
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("addLimitConfig", () => {
    it("should add a limit configuration", async () => {
      const config1 = createLimitConfiguration(1, "fake-config-1");
      const response = await limitConfigurationRepo.addLimitConfig(config1);
      expect(response.props).toMatchObject(config1.props);
    });
  });

  describe("getAllLimitConfigs", () => {
    it("should get all limit configurations sorted by priority in reverse oder", async () => {
      const config1 = createLimitConfiguration(2, "fake-config-1");
      const config2 = createLimitConfiguration(5, "fake-config-2");
      const config3 = createLimitConfiguration(1, "fake-config-3");

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
      const config1 = createLimitConfiguration(1, "fake-config-1");
      await limitConfigurationRepo.addLimitConfig(config1);

      const response = await limitConfigurationRepo.getLimitConfig("fake-config-1");
      expect(response.props).toMatchObject(config1.props);
    });

    it("should return null when limit configuration is not present", async () => {
      const response = await limitConfigurationRepo.getLimitConfig("fake-config-1");
      expect(response).toBe(null);
    });
  });
});

function createLimitConfiguration(priority: number, id: string): LimitConfiguration {
  return LimitConfiguration.createLimitConfiguration({
    _id: id,
    isDefault: false,
    priority: priority,
    profile: "fake-profile-1",
    criteria: {
      transactionType: [TransactionType.ONRAMP],
      partnerID: "fake-partner-1",
      minProfileAge: 365,
      minBalanceInWallet: 100,
      minTotalTransactionAmount: 1000,
    },
  });
}
