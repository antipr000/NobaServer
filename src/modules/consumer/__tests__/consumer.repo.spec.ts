import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IConsumerRepo } from "../repos/ConsumerRepo";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { MongoDBConsumerRepo } from "../repos/MongoDBConsumerRepo";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { NotFoundException } from "@nestjs/common";
import { KmsService } from "../../../../src/modules/common/kms.service";

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

  describe("createAndGetConsumer", () => {
    it("should create and find a user", async () => {
      const consumer = getRandomUser(DEFAULT_EMAIL_ID);
      let thrown1 = false;
      try {
        const noUser = await consumerRepo.getConsumer("notExistingID");
      } catch (e) {
        if (e instanceof NotFoundException) thrown1 = true;
      }
      expect(thrown1).toBe(true);

      const resultNotFound = await consumerRepo.getConsumerIfExists("notExistingID");
      expect(resultNotFound.isFailure).toBe(true);

      const result = await consumerRepo.createConsumer(consumer);
      const savedResult = await consumerRepo.getConsumer(result.props._id);
      expect(savedResult.props._id).toBe(result.props._id);
      expect(savedResult.props.email).toBe(consumer.props.email);

      let thrown = false; //  should throw as email already exists
      try{
        const result2 = await consumerRepo.createConsumer(consumer);
      }catch (e) {
        if (e.message.includes("already exists")) thrown = true;
      }
      expect(thrown).toBe(true);
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
      const consumer2 = getRandomUser("user2@noba.com");

      const savedConsumer = await consumerRepo.createConsumer(consumer);
      const savedConsumer2 = await consumerRepo.createConsumer(consumer2);

      const result = await consumerRepo.getConsumerByEmail(savedConsumer.props.email);
      expect(result.getValue().props.email).toBe(consumer.props.email);
    });
  });

  describe("getUserByPhone", () => {
    it("get a user by phone", async () => {
      const phone = "8242525124";
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

      const phone = "134242424"
      const updatedConsumer = getRandomUser(DEFAULT_EMAIL_ID, phone);
      await consumerRepo.updateConsumer(updatedConsumer);

      const result1 = await consumerRepo.getConsumer(result.props._id);
      expect(result1.props.phone).toBe(phone);
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
