import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { PaymentMethodsMigrator } from "../../../infraproviders/migrators/payment.method.migration";
import { PaymentProvider } from "../../../modules/consumer/domain/PaymentProvider";
import { PaymentMethodType } from "../../../modules/consumer/domain/PaymentMethod";
import { WalletStatus } from "../../../modules/consumer/domain/VerificationStatus";

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

  let paymentMethodMigrator: PaymentMethodsMigrator;

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

    paymentMethodMigrator = app.get<PaymentMethodsMigrator>(PaymentMethodsMigrator);

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
      await paymentMethodMigrator.migrate();

      const allDocumentsInConsumer = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(allDocumentsInConsumer).toHaveLength(0);
    });

    it("should not update any document if all of them are updated with new Schema", async () => {
      const partnerId = "mock-partner-id";

      const inputConsumerProps: ConsumerProps = {
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "test@noba.com",
        displayEmail: "test@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: "1111-2222-3333-4444-5555",
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
          },
        ],
      };

      await consumerCollection.insertOne({
        ...inputConsumerProps,
        _id: inputConsumerProps._id as any,
      });

      await paymentMethodMigrator.migrate();

      const outputConsumerProps = {
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "test@noba.com",
        displayEmail: "test@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
            _id: expect.anything(),
          },
        ],
        partners: [
          {
            partnerID: partnerId,
            _id: expect.anything(),
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            _id: expect.anything(),
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: "1111-2222-3333-4444-5555",
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
            _id: expect.anything(),
          },
        ],
        updatedTimestamp: expect.anything(),
      };
      const allDocumentsInConsumer = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(allDocumentsInConsumer).toHaveLength(1);
      expect(allDocumentsInConsumer[0].props).toEqual(outputConsumerProps);
    });

    it("should update document if it has old Schema", async () => {
      const partnerId = "mock-partner-id";

      const oldConsumerProps = {
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "test@noba.com",
        displayEmail: "test@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            first6Digits: "123456",
            last4Digits: "7890",
            cardType: "VISA",
            imageUri: "fake-uri",
            cardName: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: "1111-2222-3333-4444-5555",
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
          },
        ],
      };

      await consumerCollection.insertOne({
        ...oldConsumerProps,
        _id: oldConsumerProps._id as any,
      });

      await paymentMethodMigrator.migrate();

      const migratedConsumerProps = {
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "test@noba.com",
        displayEmail: "test@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
            _id: expect.anything(),
          },
        ],
        partners: [
          {
            partnerID: partnerId,
            _id: expect.anything(),
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            _id: expect.anything(),
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: "1111-2222-3333-4444-5555",
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
            _id: expect.anything(),
          },
        ],
        updatedTimestamp: expect.anything(),
      };
      const allDocumentsInConsumer = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(allDocumentsInConsumer).toHaveLength(1);
      expect(allDocumentsInConsumer[0].props).toEqual(migratedConsumerProps);
    });

    it("should update document with old schema and don't modify the new schema documents", async () => {
      const partnerId = "mock-partner-id";

      const oldSchemaInputConsumerProps = {
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "test@noba.com",
        displayEmail: "test@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            first6Digits: "123456",
            last4Digits: "7890",
            cardType: "VISA",
            imageUri: "fake-uri",
            cardName: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: "1111-2222-3333-4444-5555",
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
          },
        ],
      };
      const newSchemaInputConsumerProps = {
        _id: "mock-consumer-2",
        firstName: "Fake-2",
        lastName: "Name-2",
        email: "test-2@noba.com",
        displayEmail: "test-2@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-2",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token-2",
            cardData: {
              first6Digits: "1234567",
              last4Digits: "78901",
              cardType: "VISA",
            },
            imageUri: "fake-uri-2",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet 2",
            address: "1111-2222-3333-4444-5555-666666",
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
          },
        ],
      };

      await consumerCollection.insertOne({
        ...oldSchemaInputConsumerProps,
        _id: oldSchemaInputConsumerProps._id as any,
      });
      await consumerCollection.insertOne({
        ...newSchemaInputConsumerProps,
        _id: newSchemaInputConsumerProps._id as any,
      });

      await paymentMethodMigrator.migrate();

      const migratedOldSchemaConsumerProps = {
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "test@noba.com",
        displayEmail: "test@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
            _id: expect.anything(),
          },
        ],
        partners: [
          {
            partnerID: partnerId,
            _id: expect.anything(),
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            _id: expect.anything(),
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: "1111-2222-3333-4444-5555",
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
            _id: expect.anything(),
          },
        ],
        updatedTimestamp: expect.anything(),
      };
      const newSchemaExpectedConsumerProps = {
        _id: "mock-consumer-2",
        firstName: "Fake-2",
        lastName: "Name-2",
        email: "test-2@noba.com",
        displayEmail: "test-2@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-2",
            providerID: PaymentProvider.CHECKOUT,
            _id: expect.anything(),
          },
        ],
        partners: [
          {
            partnerID: partnerId,
            _id: expect.anything(),
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token-2",
            cardData: {
              first6Digits: "1234567",
              last4Digits: "78901",
              cardType: "VISA",
            },
            imageUri: "fake-uri-2",
            name: "Fake card",
            _id: expect.anything(),
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet 2",
            address: "1111-2222-3333-4444-5555-666666",
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
            _id: expect.anything(),
          },
        ],
        updatedTimestamp: expect.anything(),
      };
      const allDocumentsInConsumer = (await getAllRecordsInConsumerCollection(consumerCollection)).map(
        consumer => consumer.props,
      );
      expect(allDocumentsInConsumer).toHaveLength(2);
      expect(allDocumentsInConsumer).toContainEqual(migratedOldSchemaConsumerProps);
      expect(allDocumentsInConsumer).toContainEqual(newSchemaExpectedConsumerProps);
    });
  });
});
