import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { ITokenRepo } from "../repo/TokenRepo";
import { TokenMapper } from "../mapper/TokenMapper";
import { MongoDBTokenRepo } from "../repo/MongoDBTokenRepo";
import { Token } from "../domain/Token";

function createToken(rawToken: string, userID: string): Token {
  return Token.createTokenObject({ _id: Token.saltifyToken(rawToken, userID), userID: userID });
}

describe("MongoDBTokenRepoTests", () => {
  jest.setTimeout(20000);

  let tokenRepo: ITokenRepo;
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
      providers: [TokenMapper, DBProvider, MongoDBTokenRepo],
    }).compile();

    tokenRepo = app.get<MongoDBTokenRepo>(MongoDBTokenRepo);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("getToken", () => {
    it("should return a Token with token and userId, userId is used as salt to hash the token", async () => {
      const userID = "user@noba.com";
      const token = "nobatoken";
      await tokenRepo.saveToken(createToken(token, userID));
      const savedToken = await tokenRepo.getToken(token, userID);
      expect(savedToken.props._id).toBe(Token.saltifyToken(token, userID));
      expect(savedToken.props.userID).toBe(userID);
    });
  });

  describe("saveTokenObject", () => {
    it("should save an Token object", async () => {
      const userID = "user@noba.com";
      const token = "nobatoken";
      await tokenRepo.saveToken(createToken(token, userID));
      const savedToken = await tokenRepo.getToken(token, userID);
      expect(savedToken.props._id).toBe(Token.saltifyToken(token, userID));
      expect(savedToken.props.userID).toBe(userID);
    });
  });

  describe("deleteToken", () => {
    it("should delete an Token", async () => {
      const userID = "user@noba.com";
      const token = "nobatoken";
      await tokenRepo.saveToken(createToken(token, userID));
      const savedToken = await tokenRepo.getToken(token, userID);
      expect(savedToken.props._id).toBe(Token.saltifyToken(token, userID));
      expect(savedToken.props.userID).toBe(userID);

      await tokenRepo.deleteToken(token, userID);
      await expect(tokenRepo.getToken(token, userID)).rejects.toThrow();
    });
  });
});
