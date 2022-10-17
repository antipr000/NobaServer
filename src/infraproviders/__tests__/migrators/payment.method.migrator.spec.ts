import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { PaymentMethodsMigrator } from "../../../infraproviders/migrators/payment.method.migration";

const getAllRecordsInConsumerCollection = async (consumerCollection: Collection): Promise<Array<Consumer>> => {
  const consumerDocumentsCursor = consumerCollection.find({});
  const allRecords: Consumer[] = [];

  while (await consumerDocumentsCursor.hasNext()) {
    const consumerDocument = await consumerDocumentsCursor.next();

    const currentRecord: Consumer = Consumer.createConsumer({
      ...consumerDocument,
      _id: consumerDocument._id as any,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

describe("PaymentMethodMigrator", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let consumerCollection: Collection;

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
      providers: [DBProvider, PaymentMethodsMigrator],
    }).compile();

    // Setup a mongodb client for interacting with "consumers" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    consumerCollection = mongoClient.db("").collection("consumers");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("migrate", () => {
    it("should not do anything if there is no document", async () => {
      const allDocumentsInConsumer = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(allDocumentsInConsumer).toHaveLength(0);
    });

    // it("should not update any document if all of them are updated with new Schema", async () => {
    //   const newConsumer = {

    //   }

    //   const allDocumentsInConsumer = await getAllRecordsInConsumerCollection(consumerCollection);
    //   expect(allDocumentsInConsumer).toBeUndefined();
    // });
  });
});
