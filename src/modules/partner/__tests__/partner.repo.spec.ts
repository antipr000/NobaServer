import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Partner } from "../domain/Partner";
import { IPartnerRepo } from "../repo/PartnerRepo";
import { MongoDBPartnerRepo } from "../repo/MongoDBPartnerRepo";

const getAllRecordsInPartnerCollection = async (partnerCollection: Collection): Promise<Array<Partner>> => {
  const partnerDocumentsCursor = partnerCollection.find({});
  const allRecords: Partner[] = [];

  while (await partnerDocumentsCursor.hasNext()) {
    const document = await partnerDocumentsCursor.next();

    const currentRecord: Partner = Partner.createPartner({
      _id: document._id.toString(),
      apiKey: document.apiKey,
      apiKeyForEmbed: document.apiKeyForEmbed,
      secretKey: document.secretKey,
      name: document.name,
      config: document.config,
      isApiEnabled: document.isApiEnabled,
      isEmbedEnabled: document.isEmbedEnabled,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

describe("PartnerRepo", () => {
  jest.setTimeout(20000);

  let partnerRepo: IPartnerRepo;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let partnerCollection;

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
      providers: [DBProvider, MongoDBPartnerRepo],
    }).compile();

    partnerRepo = app.get<MongoDBPartnerRepo>(MongoDBPartnerRepo);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    partnerCollection = mongoClient.db("").collection("partners");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  async function insertFakePartner(id: string, apiKey: string, apiKeyForEmbed: string, secretKey: string) {
    const partner = Partner.createPartner({
      _id: id as any,
      name: "Fake Partner",
      apiKey: apiKey,
      secretKey: secretKey,
      apiKeyForEmbed: apiKeyForEmbed,
      isApiEnabled: true,
      isEmbedEnabled: true,
    });
    await partnerCollection.insertOne(partner.props);
  }

  describe("getPartnerFromApiKey", () => {
    it("should get partner when apiKey matches", async () => {
      insertFakePartner("fake-partner-1234", "fake-api-key", "fake-api-key-embed", "fake-secret-key");
      const result = await partnerRepo.getPartnerFromApiKey("fake-api-key");

      expect(result.props._id).toBe("fake-partner-1234");
    });

    it("should get partner when apiKeyForEmbed matches", async () => {
      insertFakePartner("fake-partner-1234", "fake-api-key", "fake-api-key-embed", "fake-secret-key");
      const result = await partnerRepo.getPartnerFromApiKey("fake-api-key-embed");

      expect(result.props._id).toBe("fake-partner-1234");
    });
  });
});
