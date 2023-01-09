import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { ITokenRepo } from "../repo/token.repo";
import { Token } from "../domain/Token";
import { addDays } from "date-fns";
import { SQLTokenRepo } from "../repo/sql.token.repo";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";

function createToken(rawToken: string, userID: string): Token {
  return Token.createTokenObject({
    id: Token.saltifyToken(rawToken, userID),
    userID: userID,
    isUsed: false,
    expiryTime: addDays(new Date(), 1),
  });
}

describe("TokenRepoTests", () => {
  jest.setTimeout(20000);

  let tokenRepo: ITokenRepo;
  let prismaService: PrismaService;
  let app: TestingModule;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [DBProvider, SQLTokenRepo, PrismaService],
    }).compile();

    tokenRepo = app.get<SQLTokenRepo>(SQLTokenRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await prismaService.token.deleteMany();
  });

  describe("getToken", () => {
    it("should return a Token with token and userId, userId is used as salt to hash the token", async () => {
      const userID = "user@noba.com";
      const token = "nobatoken";
      await tokenRepo.saveToken(createToken(token, userID));
      const savedToken = await tokenRepo.getToken(token, userID);
      expect(savedToken.props.id).toBe(Token.saltifyToken(token, userID));
      expect(savedToken.props.userID).toBe(userID);
    });
  });

  describe("saveTokenObject", () => {
    it("should save an Token object", async () => {
      const userID = "user@noba.com";
      const token = "nobatoken";
      await tokenRepo.saveToken(createToken(token, userID));
      const savedToken = await tokenRepo.getToken(token, userID);
      expect(savedToken.props.id).toBe(Token.saltifyToken(token, userID));
      expect(savedToken.props.userID).toBe(userID);
    });
  });

  describe("deleteToken", () => {
    it("should delete an Token", async () => {
      const userID = "user@noba.com";
      const token = "nobatoken";
      await tokenRepo.saveToken(createToken(token, userID));
      const savedToken = await tokenRepo.getToken(token, userID);
      expect(savedToken.props.id).toBe(Token.saltifyToken(token, userID));
      expect(savedToken.props.userID).toBe(userID);

      await tokenRepo.deleteToken(token, userID);
      await expect(tokenRepo.getToken(token, userID)).rejects.toThrow();
    });
  });
});
