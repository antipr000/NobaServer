import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MongoClient } from "mongodb";
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
const DEFAULT_USER_ID = "user_id";
const DEFAULT_PARTNER_ID = "partener_id";

const mkid = (id: string): string => {
  return CONSUMER_ID_PREFIX + id;
};

describe("MongoDBConsumerRepoTests", () => {
  jest.setTimeout(20000);

  let consumerRepo: IConsumerRepo;
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
      providers: [ConsumerMapper, DBProvider, MongoDBConsumerRepo, KmsService],
    }).compile();

    consumerRepo = app.get<MongoDBConsumerRepo>(MongoDBConsumerRepo);

    mongoClient = new MongoClient(mongoUri);

    await mongoClient.connect();
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("createConsumer", () => {
    it("should create a consumer", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);
      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props._id);
      expect(savedResult.props._id).toBe(result.props._id);
      expect(savedResult.props.email).toBe(consumer.props.email);

      try {
        await consumerRepo.createConsumer(consumer);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain("already exists");
      }
    });
  });

  describe("getConsumer", () => {
    it("should get a consumer", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);

      try {
        await consumerRepo.getConsumer(consumer.props._id);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }

      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props._id);
      expect(savedResult.props._id).toBe(result.props._id);
      expect(savedResult.props.email).toBe(consumer.props.email);
    });
  });

  describe("getConsumerIfExists", () => {
    it("should get a consumer if exists", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);

      const resultNotFound = await consumerRepo.getConsumerIfExists("notExistingEmailID");
      expect(resultNotFound.isFailure).toBe(true);

      await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumerIfExists(consumer.props.email);
      expect(savedResult.isSuccess).toBe(true);
      expect(savedResult.getValue().props._id).toBe(consumer.props._id);
    });
  });

  describe("checkIfUserExists", () => {
    it("should create and find a user", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);
      const result = await consumerRepo.exists(consumer.props.email);
      expect(result).toBe(false);

      const savedConsumer = await consumerRepo.createConsumer(consumer);
      const result2 = await consumerRepo.exists(savedConsumer.props.email);
      expect(result2).toBe(true);
    });
  });

  describe("getUserByEmail", () => {
    it("get a user by email", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);

      const resultNotFound = await consumerRepo.getConsumerByEmail(DEFAULT_EMAIL_ID);
      expect(resultNotFound.isFailure).toBe(true);

      const savedConsumer = await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.getConsumerByEmail(savedConsumer.props.email);
      expect(result.getValue().props.email).toBe(consumer.props.email);
    });
  });

  describe("getUserByPhone", () => {
    it("get a user by phone", async () => {
      const phone = "+18242525124";
      const consumer = getRandomUser(DEFAULT_EMAIL_ID, phone);

      const savedConsumer = await consumerRepo.createConsumer(consumer);

      const result = await consumerRepo.getConsumerByPhone(savedConsumer.props.phone);
      expect(result.getValue().props.phone).toBe(consumer.props.phone);

      const result1 = await consumerRepo.getConsumerByPhone("randomphonenumber");
      expect(result1.isFailure).toBe(true);
    });
  });

  describe("updateConsumer", () => {
    it("update a consumer", async () => {
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
