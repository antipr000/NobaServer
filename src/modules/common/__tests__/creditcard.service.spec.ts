import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CreditCardService } from "../creditcard.service";
import { BINValidity, CardType, unsupportedIssuers } from "../dto/CreditCardDTO";
import { CreditCardBinDataRepo } from "../repo/CreditCardBinDataRepo";
import { getMockCreditCardBinDataRepoMockWithDefaults } from "../mocks/mock.creditcard.bin.data.repo";
import { instance, when } from "ts-mockito";
import { CreditCardBinData } from "../domain/CreditCardBinData";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("CreditCardService", () => {
  let creditCardService: CreditCardService;
  let creditCardBinDataRepo: CreditCardBinDataRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    creditCardBinDataRepo = getMockCreditCardBinDataRepoMockWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: "CreditCardBinDataRepo",
          useFactory: () => instance(creditCardBinDataRepo),
        },
        CreditCardService,
      ],
    }).compile();

    creditCardService = app.get<CreditCardService>(CreditCardService);
  });

  describe("getBINReport()", () => {
    it("Should return the correct number of supported and unsupported BINs", async () => {
      when(creditCardBinDataRepo.getBINReport()).thenResolve({
        supported: 4,
        unsupported: 2,
      });

      const reportDetails = await creditCardService.getBINReport();

      expect(unsupportedIssuers.length).toEqual(45);
      expect(reportDetails.supported).toEqual(4);
      expect(reportDetails.unsupported).toEqual(2);
    });
  });

  describe("isBINSupported", () => {
    it("BIN with prefix 401795 should be supported", async () => {
      when(creditCardBinDataRepo.findCardByBINPrefix("401795")).thenResolve(
        CreditCardBinData.createCreditCardBinDataObject({
          _id: "fake-id",
          issuer: "chase",
          bin: "401795223",
          type: CardType.CREDIT,
          network: "VISA",
          mask: "1234XXXXXXXXX",
          supported: BINValidity.SUPPORTED,
          digits: 16,
          cvvDigits: 4,
        }),
      );
      const isSupported = await creditCardService.isBINSupported("401795");
      expect(isSupported).toEqual(BINValidity.SUPPORTED);
    });

    it("BIN with prefix 123 should be unsupported", async () => {
      when(creditCardBinDataRepo.findCardByBINPrefix("123")).thenResolve(
        CreditCardBinData.createCreditCardBinDataObject({
          _id: "fake-id",
          issuer: "chase",
          bin: "123456",
          type: CardType.CREDIT,
          network: "VISA",
          mask: "1234XXXXXXXXX",
          supported: BINValidity.NOT_SUPPORTED,
          digits: 16,
          cvvDigits: 4,
        }),
      );
      const isSupported = await creditCardService.isBINSupported("123");
      expect(isSupported).toEqual(BINValidity.NOT_SUPPORTED);
    });
  });
});
