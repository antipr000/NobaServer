import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { LimitProfile } from "../domain/LimitProfile";
import { ILimitProfileRepo } from "../repo/LimitProfileRepo";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { SQLLimitProfileRepo } from "../repo/SQLLimitProfileRepo";
import { uuid } from "uuidv4";

describe("LimitProfileRepo tests", () => {
  jest.setTimeout(20000);

  let limitProfileRepo: ILimitProfileRepo;
  let prismaService: PrismaService;
  let app: TestingModule;

  beforeAll(async () => {
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
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [SQLLimitProfileRepo, PrismaService],
    }).compile();

    limitProfileRepo = app.get<SQLLimitProfileRepo>(SQLLimitProfileRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prismaService.limitProfile.deleteMany();
  });

  afterAll(async () => {
    app.close();
  });

  describe("addProfile", () => {
    it("should add a limit profile", async () => {
      const profile = createLimitProfile();
      const response = await limitProfileRepo.addProfile(profile);
      expect(response.props).toMatchObject(profile.props);
    });
  });

  describe("getProfile", () => {
    it("should return limit profile when present", async () => {
      const profile = createLimitProfile();
      await limitProfileRepo.addProfile(profile);

      const response = await limitProfileRepo.getProfile(profile.props.id);
      expect(response.props).toMatchObject(profile.props);
    });

    it("should return null when limit profile is not present", async () => {
      const response = await limitProfileRepo.getProfile("fake-profile-1");
      expect(response).toBe(null);
    });
  });
});

function createLimitProfile(): LimitProfile {
  return LimitProfile.createLimitProfile({
    id: `${uuid()}_${new Date().valueOf()}`,
    name: "Fake Limit Profile",
    daily: 10,
    weekly: 100,
    monthly: 1000,
    maxTransaction: 5,
    minTransaction: 1,
    unsettledExposure: 100,
  });
}
