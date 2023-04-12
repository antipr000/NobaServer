import { BadRequestException } from "@nestjs/common";
import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { IVerificationDataRepo } from "../repos/verificationdata.repo";
import { SQLVerificationDataRepo } from "../repos/sql.verificationdata.repo";
import { VerificationData, VerificationDataProps } from "../domain/VerificationData";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";

const VERIFICATION_ID_PREFIX = "verification_id_prefix";
const DEFAULT_CONSUMER_ID = "consumer_id";
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

  afterAll(async () => {
    await prismaService.verification.deleteMany();
    await app.close();
  });

  describe("saveVerificationData", () => {
    it("should save verification data", async () => {
      const verificationData = getVerificationData("1");
      const savedVerificationData = await verificationRepo.saveVerificationData(verificationData);
      expect(savedVerificationData.props.id).toBe(mkid("1"));
      expect(savedVerificationData.props.consumerID).toBe(DEFAULT_CONSUMER_ID);
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
      const verificationData = getVerificationData("4");
      const vfd2 = getVerificationData("5");
      await verificationRepo.saveVerificationData(verificationData);
      await verificationRepo.saveVerificationData(vfd2);
      const savedVerificationData = await verificationRepo.getVerificationData(mkid("4"));
      const updatedVerificationData = await verificationRepo.updateVerificationData(
        VerificationData.createVerificationData({ ...savedVerificationData.props }),
      );
      expect(updatedVerificationData.props.id).toBe(mkid("4"));
      expect(updatedVerificationData.props.consumerID).toBe(DEFAULT_CONSUMER_ID);
    });
  });

  describe("getSessionKeyFromFilters", () => {
    it("should throw BadRequestException if request ", async () => {
      const verificationData = getVerificationData("6");
      await verificationRepo.saveVerificationData(verificationData);
      expect(async () => {
        await verificationRepo.getSessionKeyFromFilters({ id: mkid("5") });
      }).rejects.toThrow(BadRequestException);
    });

    it("should get session key from user ID filters", async () => {
      getVerificationData("15"); // Generate some noise data
      const verificationData = getVerificationData("7", { consumerID: "user-id-1", transactionId: "transaction-id-1" });
      getVerificationData("16"); // Generate some noise data

      await verificationRepo.saveVerificationData(verificationData);
      const sessionKey1 = await verificationRepo.getSessionKeyFromFilters({ consumerID: "user-id-1" });
      expect(sessionKey1).toBe(mkid("7"));
    });
  });
});

const getVerificationData = (
  id: string,
  options: { consumerID?: string; transactionId?: string } = {},
): VerificationData => {
  const props: VerificationDataProps = {
    id: mkid(id),
    consumerID: options.consumerID || DEFAULT_CONSUMER_ID,
  };
  const verificationData = VerificationData.createVerificationData(props);
  return verificationData;
};
