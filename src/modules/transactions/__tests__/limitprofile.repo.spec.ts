import { Test, TestingModule } from "@nestjs/testing";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { LimitProfile } from "../domain/LimitProfile";
import { ILimitProfileRepo } from "../repo/LimitProfileRepo";
import { MongoDBLimitProfileRepo } from "../repo/MongoDBLimitProfileRepo";

describe("MongoDBLimitProfileRepo", () => {
  jest.setTimeout(20000);

  let limitProfileRepo: ILimitProfileRepo;
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
      providers: [DBProvider, MongoDBLimitProfileRepo],
    }).compile();

    limitProfileRepo = app.get<MongoDBLimitProfileRepo>(MongoDBLimitProfileRepo);

    mongoClient = new MongoClient(mongoUri);

    await mongoClient.connect();
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("addProfile", () => {
    it("should add a limit profile", async () => {
      const profile = createLimitProfile("fake-profile-1");
      const response = await limitProfileRepo.addProfile(profile);
      expect(response.props).toMatchObject(profile.props);
    });
  });

  describe("getProfile", () => {
    it("should return limit profile when present", async () => {
      const profile = createLimitProfile("fake-profile-1");
      await limitProfileRepo.addProfile(profile);

      const response = await limitProfileRepo.getProfile("fake-profile-1");
      expect(response.props).toMatchObject(profile.props);
    });

    it("should return null when limit profile is not present", async () => {
      const response = await limitProfileRepo.getProfile("fake-profile-1");
      expect(response).toBe(null);
    });
  });
});

function createLimitProfile(id: string): LimitProfile {
  return LimitProfile.createLimitProfile({
    _id: id,
    name: "Fake Limit Profile",
    bankLimits: {
      daily: 10,
      weekly: 100,
      monthly: 1000,
      maxTransaction: 5,
      minTransaction: 1,
    },
    cardLimits: {
      daily: 20,
      weekly: 200,
      monthly: 2000,
      maxTransaction: 10,
      minTransaction: 5,
    },
    unsettledExposure: 100,
  });
}
