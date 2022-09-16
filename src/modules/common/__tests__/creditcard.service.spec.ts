import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CreditCardService } from "../creditcard.service";
import { BINValidity, unsupportedIssuers } from "../dto/CreditCardDTO";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe("CreditCardService", () => {
  let creditCardService: CreditCardService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          CCBIN_DATA_FILE_PATH: "./appconfigs/all_bins.csv",
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [CreditCardService],
    }).compile();

    creditCardService = app.get<CreditCardService>(CreditCardService);
  });

  describe("getBINReport()", () => {
    it("Should return the correct number of supported and unsupported BINs", async () => {
      const reportDetails = await creditCardService.getBINReport();

      // These assertions should change every time we update CreditCardDTO.unsupportedIssuers or all_bins.csv
      expect(unsupportedIssuers.length).toEqual(45);
      expect(reportDetails.supported).toEqual(10733);
      expect(reportDetails.unsupported).toEqual(659);
    });
  });

  describe("isBINSupported", () => {
    it("BIN 401795 should be supported", async () => {
      const isSupported = await creditCardService.isBINSupported("401795");
      expect(isSupported).toEqual(BINValidity.SUPPORTED);
    });

    it("BIN 40179521345 should be supported on the basis of first 6 characters", async () => {
      const isSupported = await creditCardService.isBINSupported("40179521345");
      expect(isSupported).toEqual(BINValidity.SUPPORTED);
    });

    it("8-character BIN 45715252 should be supported", async () => {
      const isSupported = await creditCardService.isBINSupported("45715252");
      expect(isSupported).toEqual(BINValidity.SUPPORTED);
    });

    it("BIN 438857 should not be supported", async () => {
      const isSupported = await creditCardService.isBINSupported("438857");
      expect(isSupported).toEqual(BINValidity.NOT_SUPPORTED);
    });

    it("BIN 438857 should not be supported", async () => {
      const isSupported = await creditCardService.isBINSupported("438857");
      expect(isSupported).toEqual(BINValidity.NOT_SUPPORTED);
    });

    it("BIN 441104 should be supported", async () => {
      const isSupported = await creditCardService.isBINSupported("441104");
      expect(isSupported).toEqual(BINValidity.SUPPORTED);
    });

    it("BIN 99999999 should be unknown", async () => {
      const isSupported = await creditCardService.isBINSupported("99999999");
      expect(isSupported).toEqual(BINValidity.UNKNOWN);
    });
  });
});
