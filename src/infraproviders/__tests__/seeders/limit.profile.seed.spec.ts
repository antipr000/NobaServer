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
  NOBA_API_KEY_FOR_EMBED,
  NOBA_CONFIG_KEY,
  NOBA_PARTNER_ID,
  NODE_ENV_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { LimitProfile } from "../../../modules/transactions/domain/LimitProfile";
import { LimitProfileSeeder } from "../../../infraproviders/seeders/limit.profile.seed";

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

const insertProfile = async (limitProfileCollection: Collection) => {
  await limitProfileCollection.insertOne({
    _id: "fake-limit-profile-1234" as any,
    name: "Fake Limit Profile",
    cardLimits: {
      minTransaction: 5,
      maxTransaction: 50,
      daily: 200,
      weekly: 1000,
      monthly: 2000,
    },
    bankLimits: {
      minTransaction: 5,
      maxTransaction: 50,
      daily: 200,
      weekly: 1000,
      monthly: 2000,
    },
    unsettledExposure: 1,
  });
};

describe("LimitProfile Seeder", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let limitProfileCollection: Collection;

  let limitProfileSeeder: LimitProfileSeeder;

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
      [NOBA_CONFIG_KEY]: {
        [NOBA_PARTNER_ID]: "test-partner-id",
        [NOBA_API_KEY_FOR_EMBED]: "test-api-key-for-embed",
      },
      [COMMON_CONFIG_KEY]: {
        [COMMON_CONFIG_HIGH_AMOUNT_THRESHOLD_KEY]: 75,
        [COMMON_CONFIG_LOW_AMOUNT_THRESHOLD_KEY]: 0.5,
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [DBProvider, LimitProfileSeeder],
    }).compile();

    limitProfileSeeder = app.get<LimitProfileSeeder>(LimitProfileSeeder);

    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    limitProfileCollection = mongoClient.db("").collection("limitprofiles");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("limit profile seed", () => {
    it("should seed default limit profile", async () => {
      // assert 0 records are present
      const allLimitProfileRecordsBefore = await getAllRecordsInLimitProfileCollection(limitProfileCollection);

      expect(allLimitProfileRecordsBefore).toHaveLength(0);

      await limitProfileSeeder.seed();

      // assert data is seeded
      const allLimitProfileRecordsAfter = await getAllRecordsInLimitProfileCollection(limitProfileCollection);

      expect(allLimitProfileRecordsAfter).toHaveLength(1);

      expect(allLimitProfileRecordsAfter[0].props.cardLimits).toStrictEqual({
        minTransaction: 0.5,
        maxTransaction: 75,
        monthly: 2000,
      });
      expect(allLimitProfileRecordsAfter[0].props.bankLimits).toStrictEqual({
        minTransaction: 0.5,
        maxTransaction: 75,
        monthly: 2000,
      });
    });

    it("should not seed limit profile when already exists", async () => {
      await insertProfile(limitProfileCollection);
      const allLimitProfileRecordsBefore = await getAllRecordsInLimitProfileCollection(limitProfileCollection);

      expect(allLimitProfileRecordsBefore).toHaveLength(1);

      await limitProfileSeeder.seed();

      // assert data is seeded
      const allLimitProfileRecordsAfter = await getAllRecordsInLimitProfileCollection(limitProfileCollection);

      expect(allLimitProfileRecordsAfter).toHaveLength(1);

      expect(allLimitProfileRecordsAfter[0].props._id).toBe("fake-limit-profile-1234");
    });
  });
});
