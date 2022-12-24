import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IVerificationDataRepo } from "../repos/IVerificationDataRepo";
import { SQLVerificationDataRepo } from "../repos/SQLVerificationDataRepo";
import { VerificationData, VerificationDataProps } from "../domain/VerificationData";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";

const VERIFICATION_ID_PREFIX = "verification_id_prefix";
const DEFAULT_USER_ID = "user_id";
const DEFAULT_TRANSACTION_ID = "transaction_id";

const mkid = (id: string): string => {
  return VERIFICATION_ID_PREFIX + id;
};

describe("VerificationRepoTests", () => {
  jest.setTimeout(20000);

  let verificationRepo: IVerificationDataRepo;
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
      providers: [PrismaService, SQLVerificationDataRepo],
    }).compile();

    verificationRepo = app.get<SQLVerificationDataRepo>(SQLVerificationDataRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prismaService.verification.deleteMany();
  });

  afterAll(async () => {
    app.close();
  });

  describe("saveVerificationData", () => {
    it("should save verification data", async () => {
      const verificationData = getVerificationData("1");
      const savedVerificationData = await verificationRepo.saveVerificationData(verificationData);
      expect(savedVerificationData.props.id).toBe(mkid("1"));
      expect(savedVerificationData.props.userID).toBe(DEFAULT_USER_ID);
    });
  });

  describe("getVerificationData", () => {
    it("should get verification data", async () => {
      const verificationData = getVerificationData("2");
      const vfd2 = getVerificationData("3");
      await verificationRepo.saveVerificationData(verificationData);
      await verificationRepo.saveVerificationData(vfd2);
      const savedVerificationData = await verificationRepo.getVerificationData(mkid("2"));
      expect(savedVerificationData.props.id).toBe(mkid("2"));
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
      expect(updatedVerificationData.props.id).toBe(mkid("1"));
      expect(updatedVerificationData.props.userID).toBe(DEFAULT_USER_ID);
      expect(updatedVerificationData.props.transactionID).toBe(mkid("tid"));
    });
  });

  describe("getSessionKeyFromFilters", () => {
    it("should get session key from filters", async () => {
      const verificationData = getVerificationData("1");
      await verificationRepo.saveVerificationData(verificationData);
      const sessionKey = await verificationRepo.getSessionKeyFromFilters({ id: mkid("1") });
      expect(sessionKey).toBe(mkid("1"));
    });
  });
});

const getVerificationData = (
  id: string,
  options: { userId?: string; transactionId?: string } = {},
): VerificationData => {
  const props: VerificationDataProps = {
    id: mkid(id),
    userID: options.userId || DEFAULT_USER_ID,
    transactionID: options.transactionId || DEFAULT_TRANSACTION_ID + "_" + uuid(),
  };
  const verificationData = VerificationData.createVerificationData(props);
  return verificationData;
};
