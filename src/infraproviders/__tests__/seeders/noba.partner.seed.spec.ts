import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../DBProvider";
import {
  AppEnvironment,
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
import { Partner } from "../../../modules/partner/domain/Partner";
import { PartnerAdmin } from "../../../modules/partner/domain/PartnerAdmin";
import { NobaPartnerSeed } from "../../../infraproviders/seeders/noba.partner.seed";

const getAllRecordsInPartnerCollection = async (partnerCollection: Collection): Promise<Array<Partner>> => {
  const partnerDocumentsCursor = partnerCollection.find({});
  const allRecords: Partner[] = [];

  while (await partnerDocumentsCursor.hasNext()) {
    const partnerDocument = await partnerDocumentsCursor.next();

    const currentRecord: Partner = Partner.createPartner({
      ...partnerDocument,
      _id: partnerDocument._id as any,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

const getAllRecordsInPartnerAdminCollection = async (
  partnerAdminCollection: Collection,
): Promise<Array<PartnerAdmin>> => {
  const partnerAdminDocumentsCursor = partnerAdminCollection.find({});
  const allRecords: PartnerAdmin[] = [];

  while (await partnerAdminDocumentsCursor.hasNext()) {
    const partnerAdminDocument = await partnerAdminDocumentsCursor.next();

    const currentRecord: PartnerAdmin = PartnerAdmin.createPartnerAdmin({
      ...partnerAdminDocument,
      _id: partnerAdminDocument._id as any,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

describe("Non Prod NobaPartnerSeeder", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let partnerCollection: Collection;
  let partnerAdminCollection: Collection;

  let nobaPartnerSeed: NobaPartnerSeed;

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
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [DBProvider, NobaPartnerSeed],
    }).compile();

    nobaPartnerSeed = app.get<NobaPartnerSeed>(NobaPartnerSeed);

    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    partnerCollection = mongoClient.db("").collection("partners");
    partnerAdminCollection = mongoClient.db("").collection("partneradmins");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("partner seed", () => {
    it("should seed noba partner in non prod environemnt", async () => {
      // assert 0 records are present
      const allPartnerRecordsBefore = await getAllRecordsInPartnerCollection(partnerCollection);

      expect(allPartnerRecordsBefore).toHaveLength(0);

      await nobaPartnerSeed.seed();

      // assert data is seeded
      const allPartnerRecordsAfter = await getAllRecordsInPartnerCollection(partnerCollection);

      expect(allPartnerRecordsAfter).toHaveLength(1);

      expect(allPartnerRecordsAfter[0].props._id).toBe("test-partner-id");
      expect(allPartnerRecordsAfter[0].props.apiKeyForEmbed).toBe("test-api-key-for-embed");
    });
  });

  describe("partnerAdminSeed", () => {
    it("should seed noba partner admins in non prod environments", async () => {
      const allPartnerAdminRecordsBefore = await getAllRecordsInPartnerAdminCollection(partnerAdminCollection);
      expect(allPartnerAdminRecordsBefore).toHaveLength(0);

      await nobaPartnerSeed.seed();

      const allPartnerAdminRecordsAfter = await getAllRecordsInPartnerAdminCollection(partnerAdminCollection);
      expect(allPartnerAdminRecordsAfter).toHaveLength(7);
      expect(allPartnerAdminRecordsAfter[0].props.partnerId).toBe("test-partner-id");
    });
  });
});

// TODO: AppEnvironment PROD is not getting set. It is always test

/*
describe("Prod NobaPartnerSeeder", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let partnerCollection: Collection;
  let partnerAdminCollection: Collection;

  let nobaPartnerSeed: NobaPartnerSeed;

  beforeEach(async () => {
    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log("MongoMemoryServer running at: ", mongoUri);

    const appConfigurations = {
      [NODE_ENV_CONFIG_KEY]: AppEnvironment.PROD,
      [MONGO_CONFIG_KEY]: {
        [MONGO_URI]: mongoUri,
      },
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        [NOBA_PARTNER_ID]: "test-partner-id",
        [NOBA_API_KEY_FOR_EMBED]: "test-api-key-for-embed",
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [DBProvider, NobaPartnerSeed],
    }).compile();

    nobaPartnerSeed = app.get<NobaPartnerSeed>(NobaPartnerSeed);

    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    partnerCollection = mongoClient.db("").collection("partners");
    partnerAdminCollection = mongoClient.db("").collection("partneradmins");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("partner seed", () => {
    it("should seed noba partner in non prod environemnt", async () => {
      // assert 0 records are present
      const allPartnerRecordsBefore = await getAllRecordsInPartnerCollection(partnerCollection);

      expect(allPartnerRecordsBefore).toHaveLength(0);

      await nobaPartnerSeed.seed();

      // assert data is seeded
      const allPartnerRecordsAfter = await getAllRecordsInPartnerCollection(partnerCollection);

      expect(allPartnerRecordsAfter).toHaveLength(1);

      expect(allPartnerRecordsAfter[0].props._id).toBe("test-partner-id");
      expect(allPartnerRecordsAfter[0].props.apiKeyForEmbed).toBe("test-api-key-for-embed");
    });
  });

  describe("partnerAdminSeed", () => {
    it("should not seed noba partner admins in prod environments", async () => {
      const allPartnerAdminRecordsBefore = await getAllRecordsInPartnerAdminCollection(partnerAdminCollection);
      expect(allPartnerAdminRecordsBefore).toHaveLength(0);

      await nobaPartnerSeed.seed();

      const allPartnerAdminRecordsAfter = await getAllRecordsInPartnerAdminCollection(partnerAdminCollection);
      expect(allPartnerAdminRecordsAfter).toHaveLength(0);
    });
  });
});
*/
