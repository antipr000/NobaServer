import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CreditCardBinData } from "../domain/CreditCardBinData";
import { SQLCreditCardBinDataRepo } from "../repo/SQLCreditCardBinDataRepo";
import { CreditCardBinDataRepo } from "../repo/CreditCardBinDataRepo";
import { BINValidity, CardType } from "../dto/CreditCardDTO";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { uuid } from "uuidv4";

describe("CreditCardBinDataRepo", () => {
  jest.setTimeout(20000);

  let creditCardBinDataRepo: CreditCardBinDataRepo;
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
      providers: [PrismaService, SQLCreditCardBinDataRepo],
    }).compile();

    creditCardBinDataRepo = app.get<SQLCreditCardBinDataRepo>(SQLCreditCardBinDataRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await prismaService.creditCardBIN.deleteMany();
  });

  afterAll(async () => {
    app.close();
  });

  function getRandomBIN(): string {
    return Math.random().toString().slice(2, 6);
  }

  function getFakeBINData(supported?: BINValidity) {
    return CreditCardBinData.createCreditCardBinDataObject({
      id: uuid(),
      bin: getRandomBIN(),
      type: CardType.CREDIT,
      supported: supported,
      network: "VISA",
      digits: 16,
      cvvDigits: 3,
      mask: "1234 XXXX XXXX",
    });
  }

  describe("add", () => {
    it("should add new creditCardBinData to db", async () => {
      const binData = getFakeBINData(BINValidity.SUPPORTED);
      const result = await creditCardBinDataRepo.add(binData);
      expect(result.props.bin).toBe(binData.props.bin);

      const getBin = await prismaService.creditCardBIN.findUnique({ where: { bin: binData.props.bin } });
      expect(getBin).toBeDefined();
    });

    it("should return null when adding new creditCardBinData fails", async () => {
      const binData = getFakeBINData(BINValidity.SUPPORTED);
      await creditCardBinDataRepo.add(binData);

      binData.props.id = uuid();

      const result = await creditCardBinDataRepo.add(binData);
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update creditCardBinData", async () => {
      const binData = getFakeBINData(BINValidity.UNKNOWN);
      await creditCardBinDataRepo.add(binData);

      let getBinData = await creditCardBinDataRepo.findByID(binData.props.id);
      expect(getBinData.props.supported).toBe(BINValidity.UNKNOWN);

      binData.props.supported = BINValidity.SUPPORTED;

      await creditCardBinDataRepo.update(binData);
      getBinData = await creditCardBinDataRepo.findByID(binData.props.id);
      expect(getBinData.props.supported).toBe(BINValidity.SUPPORTED);
    });

    it("should update creditCardBinData", async () => {
      const binData = getFakeBINData(BINValidity.UNKNOWN);

      const result = await creditCardBinDataRepo.update(binData);
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete bin data", async () => {
      const binData = getFakeBINData(BINValidity.UNKNOWN);
      await creditCardBinDataRepo.add(binData);
      let getBin = await creditCardBinDataRepo.findByID(binData.props.id);
      expect(getBin).not.toBeNull();
      await creditCardBinDataRepo.deleteByID(binData.props.id);

      getBin = await creditCardBinDataRepo.findByID(binData.props.id);
      expect(getBin).toBeNull();
    });
  });

  describe("findById", () => {
    it("should find bin data", async () => {
      const binData = getFakeBINData(BINValidity.SUPPORTED);
      await creditCardBinDataRepo.add(binData);

      const getBinData = await creditCardBinDataRepo.findByID(binData.props.id);
      expect(getBinData.props.id).toBe(binData.props.id);
      expect(getBinData.props.bin).toBe(binData.props.bin);
      expect(getBinData.props.supported).toBe(binData.props.supported);
    });

    it("should return null when bin data is not found", async () => {
      const binData = await creditCardBinDataRepo.findByID("fake-bin-1234");

      expect(binData).toBeNull();
    });
  });

  describe("findCardByExactBIN()", () => {
    it("should return proper creditCardBinData which matches bin", async () => {
      const binData = getFakeBINData(BINValidity.SUPPORTED);
      await creditCardBinDataRepo.add(binData);

      const getResult = await creditCardBinDataRepo.findCardByExactBIN(binData.props.bin);
      expect(getResult).not.toBeNull();
      expect(getResult.props.id).toBe(binData.props.id);
    });

    it("returns null if it doesn't find creditCardBinData with exact BIN", async () => {
      const result = await creditCardBinDataRepo.findCardByExactBIN("34");
      expect(result).toBe(null);
    });
  });

  describe("getBINReport", () => {
    it("should return report of supported and unsupported bins", async () => {
      const fakeBIN1 = getFakeBINData(BINValidity.SUPPORTED);
      const fakeBIN2 = getFakeBINData(BINValidity.NOT_SUPPORTED);
      const fakeBIN3 = getFakeBINData(BINValidity.SUPPORTED);
      const fakeBIN4 = getFakeBINData(BINValidity.SUPPORTED);
      const fakeBIN5 = getFakeBINData(BINValidity.NOT_SUPPORTED);

      await creditCardBinDataRepo.add(fakeBIN1);
      await creditCardBinDataRepo.add(fakeBIN2);
      await creditCardBinDataRepo.add(fakeBIN3);
      await creditCardBinDataRepo.add(fakeBIN4);
      await creditCardBinDataRepo.add(fakeBIN5);

      const report = await creditCardBinDataRepo.getBINReport();
      expect(report.unsupported).toBe(2);
      expect(report.supported).toBe(3);
    });
  });
});
