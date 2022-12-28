import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { CreditCardService } from "../creditcard.service";
import { BINValidity, CardType, CreditCardDTO } from "../dto/CreditCardDTO";
import { CreditCardBinDataRepo } from "../repo/CreditCardBinDataRepo";
import { getMockCreditCardBinDataRepoMockWithDefaults } from "../mocks/mock.creditcard.bin.data.repo";
import { anything, deepEqual, instance, verify, when } from "ts-mockito";
import { CreditCardBinData, CreditCardBinDataProps } from "../domain/CreditCardBinData";
import { BadRequestException } from "@nestjs/common";

/**
 * Need to update config for this to work (work-in-progress). Testing as part of e2e currently.
 */
describe.skip("CreditCardService", () => {
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

      expect(reportDetails.supported).toEqual(4);
      expect(reportDetails.unsupported).toEqual(2);
    });
  });

  describe("isBINSupported", () => {
    it("BIN 401795 should be supported", async () => {
      when(creditCardBinDataRepo.findCardByExactBIN("401795")).thenResolve(
        CreditCardBinData.createCreditCardBinDataObject({
          id: "fake-id",
          issuer: "chase",
          bin: "401795",
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

    it("Partial BIN 4017 should be unknown", async () => {
      when(creditCardBinDataRepo.findCardByExactBIN("4017")).thenResolve(
        CreditCardBinData.createCreditCardBinDataObject({
          id: "fake-id",
          issuer: "chase",
          bin: "401795", // Regular BIN but we're testing a subset
          type: CardType.CREDIT,
          network: "VISA",
          mask: "1234XXXXXXXXX",
          supported: BINValidity.UNKNOWN,
          digits: 16,
          cvvDigits: 4,
        }),
      );
      const isSupported = await creditCardService.isBINSupported("4017");
      expect(isSupported).toEqual(BINValidity.UNKNOWN);
    });

    it("Extra long BIN 4017951234 should be unknown", async () => {
      when(creditCardBinDataRepo.findCardByExactBIN("4017951234")).thenResolve(
        CreditCardBinData.createCreditCardBinDataObject({
          id: "fake-id",
          issuer: "chase",
          bin: "401795", // Regular BIN but we're testing a longer value
          type: CardType.CREDIT,
          network: "VISA",
          mask: "1234XXXXXXXXX",
          supported: BINValidity.UNKNOWN,
          digits: 16,
          cvvDigits: 4,
        }),
      );
      const isSupported = await creditCardService.isBINSupported("4017951234");
      expect(isSupported).toEqual(BINValidity.UNKNOWN);
    });

    it("Extra long BIN 4017951234 should be unknown", async () => {
      when(creditCardBinDataRepo.findCardByExactBIN("12345")).thenResolve(null);
      const isSupported = await creditCardService.isBINSupported("12345");
      expect(isSupported).toEqual(BINValidity.UNKNOWN);
    });

    it("BIN 123 should be unsupported", async () => {
      when(creditCardBinDataRepo.findCardByExactBIN("123")).thenResolve(
        CreditCardBinData.createCreditCardBinDataObject({
          id: "fake-id",
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

  describe("addOrUpdateBinData", () => {
    it("should call addBinData when bin data does not exist", async () => {
      const creditCardProps: Partial<CreditCardBinDataProps> = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "42424",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 10,
        cvvDigits: 3,
      };

      const creditCardDTO: CreditCardDTO = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "42424",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 10,
        cvvDigits: 3,
        mask: "4242 4XXX XX ",
      };

      const creditCardData = CreditCardBinData.createCreditCardBinDataObject(creditCardProps);
      when(creditCardBinDataRepo.findCardByExactBIN(creditCardProps.bin)).thenResolve(undefined);
      when(creditCardBinDataRepo.add(anything())).thenResolve(creditCardData);

      await creditCardService.addOrUpdateBinData(creditCardDTO);
      verify(creditCardBinDataRepo.add(deepEqual(creditCardData))).once();
    });

    it("should call updateBINData when bin data does not exist", async () => {
      const creditCardDTO: CreditCardDTO = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "42424",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 10,
        cvvDigits: 3,
      };
      const creditCardData = CreditCardBinData.createCreditCardBinDataObject(creditCardDTO);
      when(creditCardBinDataRepo.findCardByExactBIN(creditCardDTO.bin)).thenResolve(creditCardData);

      when(creditCardBinDataRepo.update(anything())).thenResolve(creditCardData);

      await creditCardService.addOrUpdateBinData(creditCardDTO);
      verify(creditCardBinDataRepo.update(deepEqual(creditCardData))).once();
    });
  });

  describe("addBinData", () => {
    it("adds new bin data record", async () => {
      const creditCardDTO: CreditCardDTO = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "42424",
        mask: "4242 4XXX XXXX XXXX",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 16,
        cvvDigits: 3,
      };

      const creditCardData = CreditCardBinData.createCreditCardBinDataObject(creditCardDTO);

      when(creditCardBinDataRepo.findCardByExactBIN(creditCardDTO.bin)).thenResolve(null);
      when(creditCardBinDataRepo.add(anything())).thenResolve(creditCardData);

      const response = await creditCardService.addBinData(creditCardDTO);

      expect(response).toStrictEqual(creditCardDTO);
    });

    it("should throw error when already exists", async () => {
      const creditCardDTO: CreditCardDTO = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "454347",
        mask: "4543 47XX XXXX XXXX",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 10,
        cvvDigits: 3,
      };

      const creditCardData = CreditCardBinData.createCreditCardBinDataObject(creditCardDTO);

      when(creditCardBinDataRepo.findCardByExactBIN(creditCardDTO.bin)).thenResolve(creditCardData);
      when(creditCardBinDataRepo.add(anything())).thenResolve(creditCardData);
      try {
        await creditCardService.addBinData(creditCardDTO);
        expect(true).toBeFalsy();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("BIN already exists");
      }
    });

    it("should throw error when adding bin data fails", async () => {
      const creditCardDTO: CreditCardDTO = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "454347",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 10,
        cvvDigits: 3,
      };

      when(creditCardBinDataRepo.findCardByExactBIN(creditCardDTO.bin)).thenResolve(null);
      when(creditCardBinDataRepo.add(anything())).thenResolve(null);
      try {
        await creditCardService.addBinData(creditCardDTO);
        expect(true).toBeFalsy();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Failed to add bin data");
      }
    });
  });

  describe("updateBinData", () => {
    it("updated credit card data", async () => {
      const creditCardDTO: CreditCardDTO = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "454347",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 10,
        cvvDigits: 3,
      };

      const creditCardData = CreditCardBinData.createCreditCardBinDataObject(creditCardDTO);

      const updatedCreditCardData = CreditCardBinData.createCreditCardBinDataObject({
        ...creditCardData.props,
        supported: BINValidity.NOT_SUPPORTED,
      });
      when(creditCardBinDataRepo.findCardByExactBIN(creditCardDTO.bin)).thenResolve(creditCardData);
      when(creditCardBinDataRepo.update(deepEqual(updatedCreditCardData))).thenResolve(updatedCreditCardData);

      const response = await creditCardService.updateBinData({
        ...creditCardDTO,
        supported: BINValidity.NOT_SUPPORTED,
      });

      const expectedResponse = updatedCreditCardData.props;

      delete expectedResponse.id;
      delete expectedResponse.mask;

      expect(response).toStrictEqual(expectedResponse);
    });

    it("should throw when bin data is not present", async () => {
      const creditCardDTO: CreditCardDTO = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "454347",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 10,
        cvvDigits: 3,
      };

      const creditCardData = CreditCardBinData.createCreditCardBinDataObject(creditCardDTO);

      const updatedCreditCardData = CreditCardBinData.createCreditCardBinDataObject({
        ...creditCardData.props,
        supported: BINValidity.NOT_SUPPORTED,
      });
      when(creditCardBinDataRepo.findCardByExactBIN(creditCardDTO.bin)).thenResolve(null);
      when(creditCardBinDataRepo.update(deepEqual(updatedCreditCardData))).thenResolve(updatedCreditCardData);

      try {
        await creditCardService.updateBinData({
          ...creditCardDTO,
          supported: BINValidity.NOT_SUPPORTED,
        });
        expect(true).toBeFalsy();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Bin data not found!");
      }
    });

    it("should throw when update fails", async () => {
      const creditCardDTO: CreditCardDTO = {
        issuer: "bank_of_america",
        network: "VISA",
        bin: "454347",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 10,
        cvvDigits: 3,
      };

      const creditCardData = CreditCardBinData.createCreditCardBinDataObject(creditCardDTO);

      const updatedCreditCardData = CreditCardBinData.createCreditCardBinDataObject({
        ...creditCardData.props,
        supported: BINValidity.NOT_SUPPORTED,
      });
      when(creditCardBinDataRepo.findCardByExactBIN(creditCardDTO.bin)).thenResolve(creditCardData);
      when(creditCardBinDataRepo.update(deepEqual(updatedCreditCardData))).thenResolve(null);

      try {
        await creditCardService.updateBinData({
          ...creditCardDTO,
          supported: BINValidity.NOT_SUPPORTED,
        });
        expect(true).toBeFalsy();
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Failed to update bin data");
      }
    });
  });
});
