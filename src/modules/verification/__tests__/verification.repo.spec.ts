import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IVerificationDataRepo } from "../repos/IVerificationDataRepo";
import { MongoDBVerificationDataRepo } from "../repos/MongoDBVerificationDataRepo";
import { VerificationData, VerificationDataProps } from "../domain/VerificationData";

const VERIFICATION_ID_PREFIX = "verification_id_prefix";
const TEST_NUMBER = 5;
const DEFAULT_USER_ID = "user_id";
const DEFAULT_PARTNER_ID = "partener_id";
const DEFAULT_TRANSACTION_ID = "transaction_id";

const mkid = (id: string): string => {
  return VERIFICATION_ID_PREFIX + id;
};

describe("MongoDBVerificationRepoTests", () => {
  jest.setTimeout(20000);

  let verificationRepo: IVerificationDataRepo;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let verificationCollection: Collection;

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
      providers: [DBProvider, MongoDBVerificationDataRepo],
    }).compile();

    verificationRepo = app.get<MongoDBVerificationDataRepo>(MongoDBVerificationDataRepo);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    verificationCollection = mongoClient.db("").collection("VerificationData");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("saveVerificationData", () => {
    it("should save verification data", async () => {
      const verificationData = getVerificationData("1");
      const savedVerificationData = await verificationRepo.saveVerificationData(verificationData);
      expect(savedVerificationData.props._id).toBe(mkid("1"));
      expect(savedVerificationData.props.userID).toBe(DEFAULT_USER_ID);
    });
  });

  describe("getVerificationData", () => {
    it("should get verification data", async () => {
      const verificationData = getVerificationData("1");
      const vfd2 = getVerificationData("2");
      await verificationRepo.saveVerificationData(verificationData);
      await verificationRepo.saveVerificationData(vfd2);
      const savedVerificationData = await verificationRepo.getVerificationData(mkid("1"));
      expect(savedVerificationData.props._id).toBe(mkid("1"));
    });
  });

  describe("updateVerificationData", () => {
    it("should update verification data", async () => {
      const verificationData = getVerificationData("1");
      const vfd2 = getVerificationData("2");
      await verificationRepo.saveVerificationData(verificationData);
      await verificationRepo.saveVerificationData(vfd2);
      const savedVerificationData = await verificationRepo.getVerificationData(mkid("1"));
      const updatedVerificationData = await verificationRepo.updateVerificationData(
        VerificationData.createVerificationData({ ...savedVerificationData.props, transactionID: mkid("tid") }),
      );
      expect(updatedVerificationData.props._id).toBe(mkid("1"));
      expect(updatedVerificationData.props.userID).toBe(DEFAULT_USER_ID);
      expect(updatedVerificationData.props.transactionID).toBe(mkid("tid"));
    });
  });

  describe("getSessionKeyFromFilters", () => {
    it("should get session key from filters", async () => {
      const verificationData = getVerificationData("1");
      await verificationRepo.saveVerificationData(verificationData);
      const sessionKey = await verificationRepo.getSessionKeyFromFilters({ _id: mkid("1") });
      expect(sessionKey).toBe(mkid("1"));
    });
  });
});

const getVerificationData = (
  id: string,
  options: { userId?: string; transactionId?: string } = {},
): VerificationData => {
  const props: VerificationDataProps = {
    _id: mkid(id),
    userID: options.userId || DEFAULT_USER_ID,
    transactionID: options.transactionId || DEFAULT_TRANSACTION_ID,
  };
  const verificationData = VerificationData.createVerificationData(props);
  return verificationData;
};
