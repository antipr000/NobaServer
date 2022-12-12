import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../DBProvider";
import {
  AppEnvironment,
  COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY,
  COMMON_CONFIG_KEY,
  COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY,
  MONGO_CONFIG_KEY,
  MONGO_URI,
  NOBA_CONFIG_KEY,
  NODE_ENV_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { LimitProfile } from "../../../modules/transactions/domain/LimitProfile";
import { LimitProfileSeeder } from "../../../infraproviders/seeders/limit.profile.seed";
import { LimitConfiguration } from "../../../modules/transactions/domain/LimitConfiguration";
import { LimitConfigSeeder } from "../../../infraproviders/seeders/limit.config.seed";

const getAllRecordsInLimitProfileCollection = async (
  limitProfileCollection: Collection,
): Promise<Array<LimitProfile>> => {
  const limitProfileDocumentsCursor = limitProfileCollection.find({});
  const allRecords: LimitProfile[] = [];

  while (await limitProfileDocumentsCursor.hasNext()) {
    const limitProfileDocument = await limitProfileDocumentsCursor.next();

    const currentRecord: LimitProfile = LimitProfile.createLimitProfile({
      ...limitProfileDocument,
      _id: limitProfileDocument._id as any,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

const getAllRecordsInLimitConfigCollection = async (
  limitConfigCollection: Collection,
): Promise<Array<LimitConfiguration>> => {
  const limitConfigDocumentsCursor = limitConfigCollection.find({});
  const allRecords: LimitConfiguration[] = [];

  while (await limitConfigDocumentsCursor.hasNext()) {
    const limitConfigDocument = await limitConfigDocumentsCursor.next();

    const currentRecord: LimitConfiguration = LimitConfiguration.createLimitConfiguration({
      ...limitConfigDocument,
      _id: limitConfigDocument._id as any,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

const insertConfiguration = async (limitConfigCollection: Collection) => {
  await limitConfigCollection.insertOne({
    _id: "new-fake-config-1234" as any,
    isDefault: false,
    priority: 1,
    profile: "fake-profile-1234",
    criteria: {},
  });
};

describe("LimitConfig Seeder", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let limitProfileCollection: Collection;
  let limitConfigCollection: Collection;

  let limitProfileSeeder: LimitProfileSeeder;
  let limitConfigSeeder: LimitConfigSeeder;

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
      [NODE_ENV_CONFIG_KEY]: AppEnvironment.DEV,
      [MONGO_CONFIG_KEY]: {
        [MONGO_URI]: mongoUri,
      },
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [COMMON_CONFIG_KEY]: {
        [COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY]: 50,
        [COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY]: 0.5,
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [DBProvider, LimitProfileSeeder, LimitConfigSeeder],
    }).compile();

    limitProfileSeeder = app.get<LimitProfileSeeder>(LimitProfileSeeder);
    limitConfigSeeder = app.get<LimitConfigSeeder>(LimitConfigSeeder);

    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    limitProfileCollection = mongoClient.db("").collection("limitprofiles");
    limitConfigCollection = mongoClient.db("").collection("limitconfigurations");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("limit config seed", () => {
    it("should seed default limit profile", async () => {
      // assert 0 records are present
      const allLimitConfigRecordsBefore = await getAllRecordsInLimitConfigCollection(limitConfigCollection);

      expect(allLimitConfigRecordsBefore).toHaveLength(0);

      await limitProfileSeeder.seed();
      await limitConfigSeeder.seed();

      // assert data is seeded
      const allLimitConfigRecordsAfter = await getAllRecordsInLimitConfigCollection(limitConfigCollection);
      const allLimitProfiles = await getAllRecordsInLimitProfileCollection(limitProfileCollection);

      expect(allLimitConfigRecordsAfter).toHaveLength(1);

      expect(allLimitConfigRecordsAfter[0].props.isDefault).toBe(true);
      expect(allLimitConfigRecordsAfter[0].props.profile).toBe(allLimitProfiles[0].props._id);
    });

    it("should not seed it configuration already exists", async () => {
      await insertConfiguration(limitConfigCollection);
      const allLimitConfigRecordsBefore = await getAllRecordsInLimitConfigCollection(limitConfigCollection);
      expect(allLimitConfigRecordsBefore).toHaveLength(1);

      await limitProfileSeeder.seed();
      await limitConfigSeeder.seed();

      const allLimitConfigRecordsAfter = await getAllRecordsInLimitConfigCollection(limitConfigCollection);
      expect(allLimitConfigRecordsAfter).toHaveLength(1);
      expect(allLimitConfigRecordsAfter[0].props.isDefault).toBe(false);
    });
  });
});
