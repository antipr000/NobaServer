import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MongoClient, Collection } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { KmsService } from "../../../../src/modules/common/kms.service";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { IConsumerRepo } from "../repos/ConsumerRepo";
import { MongoDBConsumerRepo } from "../repos/MongoDBConsumerRepo";

const CONSUMER_ID_PREFIX = "consumer_id_prefix";
const TEST_NUMBER = 5;
const DEFAULT_EMAIL_ID = "user@noba.com";
const DEFAULT_PHONE_NUMBER = "+15555555555";
const DEFAULT_USER_ID = "user_id";
const DEFAULT_PARTNER_ID = "partener_id";

const mkid = (id: string): string => {
  return CONSUMER_ID_PREFIX + id;
};

const getAllRecordsInConsumerCollection = async (consumerCollection: Collection): Promise<ConsumerProps[]> => {
  const consumerDocumentsCursor = consumerCollection.find({});
  const allRecords: ConsumerProps[] = [];

  while (await consumerDocumentsCursor.hasNext()) {
    const consumerDocument = await consumerDocumentsCursor.next();

    const currentRecord: ConsumerProps = {
      _id: consumerDocument._id as any,
      firstName: consumerDocument.firstName,
      lastName: consumerDocument.lastName,
      email: consumerDocument.email,
      handle: consumerDocument.handle,
      displayEmail: consumerDocument.displayEmail,
      phone: consumerDocument.phone,
      isAdmin: consumerDocument.isAdmin,
      dateOfBirth: consumerDocument.dateOfBirth,
      address: consumerDocument.address,
      socialSecurityNumber: consumerDocument.socialSecurityNumber,
      nationalID: consumerDocument.nationalID,
      nationalIDType: consumerDocument.nationalIDType,
      riskRating: consumerDocument.riskRating,
      isSuspectedFraud: consumerDocument.isSuspectedFraud,
      isLocked: consumerDocument.isLocked,
      isDisabled: consumerDocument.isDisabled,
      zhParticipantCode: consumerDocument.zhParticipantCode,
      partners: consumerDocument.partners,
      paymentProviderAccounts: consumerDocument.paymentProviderAccounts,
      verificationData: consumerDocument.verificationData,
      paymentMethods: consumerDocument.paymentMethods,
      cryptoWallets: consumerDocument.cryptoWallets,
    };
    allRecords.push(currentRecord);
  }

  return allRecords;
};

describe("MongoDBConsumerRepoTests", () => {
  jest.setTimeout(20000);

  let consumerRepo: IConsumerRepo;
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
      providers: [ConsumerMapper, DBProvider, MongoDBConsumerRepo, KmsService],
    }).compile();

    consumerRepo = app.get<MongoDBConsumerRepo>(MongoDBConsumerRepo);

    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    consumerCollection = mongoClient.db("").collection("consumers");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("createConsumer", () => {
    it("should fail to create a duplicate consumer by email", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);
      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props._id);
      expect(savedResult.props._id).toBe(result.props._id);
      expect(savedResult.props.email).toBe(consumer.props.email);
      expect(async () => await consumerRepo.createConsumer(consumer)).rejects.toThrow(
        "Consumer with given email address already exists",
      );
    });

    it("should fail to create a duplicate consumer by phone", async () => {
      const consumer = getRandomUser(null, DEFAULT_PHONE_NUMBER);
      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props._id);
      expect(savedResult.props._id).toBe(result.props._id);
      expect(savedResult.props.phone).toBe(consumer.props.phone);
      expect(async () => await consumerRepo.createConsumer(consumer)).rejects.toThrow(
        "Consumer with given phone number already exists",
      );
    });

    it("should fail to create a duplicate consumer by phone even with different spacing", async () => {
      const consumer = getRandomUser(null, DEFAULT_PHONE_NUMBER);
      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props._id);
      expect(savedResult.props._id).toBe(result.props._id);
      expect(savedResult.props.phone).toBe(consumer.props.phone);
      consumer.props.phone = "+155 55555  555";
      expect(async () => await consumerRepo.createConsumer(consumer)).rejects.toThrow(
        "Consumer with given phone number already exists",
      );
    });

    it("shouldn't modify the 'handle', if already specified, before saving the consumer", async () => {
      const consumerProps: ConsumerProps = {
        _id: "test-consumer-id",
        firstName: "firstName",
        lastName: "lastName",
        email: "test@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test2",
      };
      const returnedResult = await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps));

      const savedResults: ConsumerProps[] = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].handle).toBe("test2");

      expect(returnedResult.props.handle).toBe(savedResults[0].handle);
    });

    it("should add a 'default' handle (if not specified) before saving the consumer", async () => {
      const consumerProps: ConsumerProps = {
        _id: "test-consumer-id",
        firstName: "firstName",
        lastName: "lastName",
        email: "test@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
      };
      const returnedResult = await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps));

      const savedResults: ConsumerProps[] = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].handle).toBeDefined();
      expect(savedResults[0].handle.length).toBeGreaterThanOrEqual(3);
      expect(savedResults[0].handle.length).toBeLessThanOrEqual(15);
      expect(savedResults[0].handle[0] != "_").toBeTruthy();

      expect(returnedResult.props.handle).toBe(savedResults[0].handle);
    });

    it("should add a 'default' handle which doesn't have 'dots' (.) even if email has it", async () => {
      const consumerProps: ConsumerProps = {
        _id: "test-consumer-id",
        firstName: "firstName",
        lastName: "lastName",
        email: "test.test@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
      };
      const returnedResult = await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps));

      const savedResults: ConsumerProps[] = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].handle).toBeDefined();
      expect(savedResults[0].handle.indexOf(".")).toBe(-1);
      expect(savedResults[0].handle.length).toBeGreaterThanOrEqual(3);
      expect(savedResults[0].handle.length).toBeLessThanOrEqual(15);
      expect(savedResults[0].handle[0] != "_").toBeTruthy();

      expect(returnedResult.props.handle).toBe(savedResults[0].handle);
    });

    it("should add a 'default' handle which doesn't have 'dots' (.) even if firstname has it", async () => {
      const consumerProps: ConsumerProps = {
        _id: "test-consumer-id",
        firstName: "first.Name",
        lastName: "lastName",
        email: "test.test@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
      };
      const returnedResult = await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps));

      const savedResults: ConsumerProps[] = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].handle).toBeDefined();
      expect(savedResults[0].handle.indexOf(".")).toBe(-1);
      expect(savedResults[0].handle.length).toBeGreaterThanOrEqual(3);
      expect(savedResults[0].handle.length).toBeLessThanOrEqual(15);
      expect(savedResults[0].handle[0] != "_").toBeTruthy();

      expect(returnedResult.props.handle).toBe(savedResults[0].handle);
    });

    it("should add a 'default' handle which doesn't have '_' as first character if firstname is not present", async () => {
      const consumerProps: ConsumerProps = {
        _id: "test-consumer-id",
        lastName: "lastName",
        email: "test.test@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
      };
      const returnedResult = await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps));

      const savedResults: ConsumerProps[] = await getAllRecordsInConsumerCollection(consumerCollection);
      expect(savedResults).toHaveLength(1);
      expect(savedResults[0].handle).toBeDefined();
      expect(savedResults[0].handle.indexOf(".")).toBe(-1);
      expect(savedResults[0].handle.length).toBeGreaterThanOrEqual(3);
      expect(savedResults[0].handle.length).toBeLessThanOrEqual(15);
      expect(savedResults[0].handle[0] != "_").toBeTruthy();

      expect(returnedResult.props.handle).toBe(savedResults[0].handle);
    });
  });

  describe("getConsumer", () => {
    it("should get a consumer", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);
      expect(async () => await consumerRepo.getConsumer(consumer.props._id)).rejects.toThrow(NotFoundException);

      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props._id);
      expect(savedResult.props._id).toBe(result.props._id);
      expect(savedResult.props.email).toBe(consumer.props.email);
    });
  });

  describe("checkIfUserExists", () => {
    it("should create and find a user by email", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);
      const result = await consumerRepo.exists(consumer.props.email);
      expect(result).toBe(false);

      const savedConsumer = await consumerRepo.createConsumer(consumer);
      const result2 = await consumerRepo.exists(savedConsumer.props.email);
      expect(result2).toBe(true);
    });

    it("should create and find a user by phone", async () => {
      const consumer = getRandomUser(null, DEFAULT_PHONE_NUMBER);
      const result = await consumerRepo.exists(consumer.props.phone);
      expect(result).toBe(false);

      const savedConsumer = await consumerRepo.createConsumer(consumer);
      const result2 = await consumerRepo.exists(savedConsumer.props.phone);
      expect(result2).toBe(true);
    });
  });

  describe("getConsumerByEmail", () => {
    it("get a user by email", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);

      const resultNotFound = await consumerRepo.getConsumerByEmail(DEFAULT_EMAIL_ID);
      expect(resultNotFound.isFailure).toBe(true);

      const savedConsumer = await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.getConsumerByEmail(savedConsumer.props.email);
      expect(result.getValue().props.email).toBe(consumer.props.email);
    });

    it("should get a consumer by email if exists", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);

      const resultNotFound = await consumerRepo.getConsumerByEmail("notExistingEmailID");
      expect(resultNotFound.isFailure).toBe(true);

      await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumerByEmail(consumer.props.email);
      expect(savedResult.isSuccess).toBe(true);
      expect(savedResult.getValue().props._id).toBe(consumer.props._id);
    });

    it("should throw an error if passed an empty email address", async () => {
      expect(async () => await consumerRepo.getConsumerByEmail(null)).rejects.toThrow(Error);
    });
  });

  describe("getConsumerByPhone", () => {
    it("get a user by phone", async () => {
      const phone = "+18242525124";
      const consumer = getRandomUser(DEFAULT_EMAIL_ID, phone);

      const savedConsumer = await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.getConsumerByPhone(savedConsumer.props.phone);
      expect(result.getValue().props.phone).toBe(consumer.props.phone);

      const result1 = await consumerRepo.getConsumerByPhone("randomphonenumber");
      expect(result1.isFailure).toBe(true);
    });

    it("should get a consumer by phone if exists", async () => {
      const consumer = getRandomUser(null, DEFAULT_PHONE_NUMBER);

      const resultNotFound = await consumerRepo.getConsumerByPhone("notExistingPhoneNumber");
      expect(resultNotFound.isFailure).toBe(true);

      await consumerRepo.createConsumer(consumer);
      let savedResult = await consumerRepo.getConsumerByPhone(consumer.props.phone);
      expect(savedResult.isSuccess).toBe(true);
      expect(savedResult.getValue().props._id).toBe(consumer.props._id);

      // should get consumer record even when requested phone number has spaces
      savedResult = await consumerRepo.getConsumerByPhone("+15 5555  55555");
      expect(savedResult.isSuccess).toBe(true);
      expect(savedResult.getValue().props._id).toBe(consumer.props._id);
    });

    it("should throw an error if passed an empty phone number", async () => {
      expect(async () => await consumerRepo.getConsumerByPhone(null)).rejects.toThrow(Error);
    });
  });

  describe("updateConsumer", () => {
    it("should update a consumer", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);

      const savedConsumer = await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.getConsumer(savedConsumer.props._id);
      expect(result.props.phone).toBe(undefined);

      const phone = "+134242424";
      const updatedConsumer = getRandomUser(DEFAULT_EMAIL_ID, phone);
      await consumerRepo.updateConsumer(updatedConsumer);

      const result1 = await consumerRepo.getConsumer(result.props._id);
      expect(result1.props.phone).toBe(phone);
    });

    it("should throw error if tried to update 'handle' which already exists", async () => {
      const consumerProps1: ConsumerProps = {
        _id: "test-consumer-id-1",
        firstName: "firstName",
        lastName: "lastName",
        email: "test-1@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test1",
      };
      await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps1));

      const consumerProps2: ConsumerProps = {
        _id: "test-consumer-id-2",
        firstName: "firstName",
        lastName: "lastName",
        email: "test-2@noba.com",
        phone: "+9876541231",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test2",
      };
      await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps2));

      try {
        consumerProps2.handle = "test1";
        await consumerRepo.updateConsumer(Consumer.createConsumer(consumerProps2));
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe("A user with same 'handle' already exists.");
      }
    });

    it("should update the consumer if 'handle' is not associated with any Consumer already", async () => {
      const consumerProps1: ConsumerProps = {
        _id: "test-consumer-id-1",
        firstName: "firstName",
        lastName: "lastName",
        email: "test-1@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test1",
      };
      await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps1));

      const consumerProps2: ConsumerProps = {
        _id: "test-consumer-id-2",
        firstName: "firstName",
        lastName: "lastName",
        email: "test-2@noba.com",
        phone: "+9876541231",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test2",
      };
      await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps2));

      consumerProps2.handle = "test3";
      await consumerRepo.updateConsumer(Consumer.createConsumer(consumerProps2));

      const consumerRecordForId2 = (await getAllRecordsInConsumerCollection(consumerCollection)).filter(record => {
        return record._id === "test-consumer-id-2";
      })[0];
      expect(consumerRecordForId2.handle).toBe("test3");
    });

    it("shouldn't update the consumer 'handle' is not updated", async () => {
      const consumerProps1: ConsumerProps = {
        _id: "test-consumer-id-1",
        firstName: "firstName",
        lastName: "lastName",
        email: "test-1@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test1",
      };
      await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps1));

      const consumerProps2: ConsumerProps = {
        _id: "test-consumer-id-2",
        firstName: "firstName",
        lastName: "lastName",
        email: "test-2@noba.com",
        phone: "+9876541231",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test2",
      };
      await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps2));

      consumerProps2.phone = "+9876541235";
      await consumerRepo.updateConsumer(Consumer.createConsumer(consumerProps2));

      const consumerRecordForId2 = (await getAllRecordsInConsumerCollection(consumerCollection)).filter(record => {
        return record._id === "test-consumer-id-2";
      })[0];
      expect(consumerRecordForId2.handle).toBe("test2");
    });
  });

  describe("getAllConsumersForPartner", () => {
    it("update a consumer", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);
      const savedConsumer = await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.getAllConsumersForPartner(DEFAULT_PARTNER_ID);
      expect(result.length).toBe(1);
      expect(result[0].props.email).toBe(savedConsumer.props.email);
    });
  });

  describe("isHandleTaken", () => {
    it("should return 'true' if there already exist an user with same handle", async () => {
      const consumerProps: ConsumerProps = {
        _id: "test-consumer-id",
        firstName: "firstName",
        lastName: "lastName",
        email: "test@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test",
      };
      await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps));

      const result = await consumerRepo.isHandleTaken("test");
      expect(result).toBe(true);
    });

    it("should return 'false' if there isn't an user with same handle", async () => {
      const consumerProps: ConsumerProps = {
        _id: "test-consumer-id",
        firstName: "firstName",
        lastName: "lastName",
        email: "test@noba.com",
        phone: "+9876541230",
        partners: [{ partnerID: DEFAULT_PARTNER_ID }],
        handle: "test2",
      };
      await consumerRepo.createConsumer(Consumer.createConsumer(consumerProps));

      const result = await consumerRepo.isHandleTaken("test");
      expect(result).toBe(false);
    });
  });
});

const getRandomUser = (email: string, phone?: string): Consumer => {
  const props: ConsumerProps = {
    _id: mkid(email),
    firstName: "firstName",
    lastName: "lastName",
    email: email,
    phone: phone,
    partners: [{ partnerID: DEFAULT_PARTNER_ID }],
  };
  return Consumer.createConsumer(props);
};
