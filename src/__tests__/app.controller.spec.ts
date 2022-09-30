import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "../app.controller";
import { AppService } from "../app.service";
import { anything, instance, when } from "ts-mockito";
import { TestConfigModule } from "../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../core/utils/WinstonModule";
import { getMockAppServiceWithDefaults } from "../mocks/mock.app.service";
import { CurrencyService } from "../modules/common/currency.service";
import { CreditCardService } from "../modules/common/creditcard.service";
import { LocationService } from "../modules/common/location.service";
import { getMockCreditCardServiceWithDefaults } from "../modules/common/mocks/mock.creditcard.service";
import { getMockLocationServiceWithDefaults } from "../modules/common/mocks/mock.location.service";
import { getMockCurrencyServiceWithDefaults } from "../modules/common/mocks/mock.currency.service";
import { ConfigurationProviderService } from "../modules/common/configuration.provider.service";
import { getMockConfigurationProviderServiceWithDefaults } from "../modules/common/mocks/mock.configuration.provider.service";
import { NotFoundException } from "@nestjs/common";
import { BINValidity, CardType, CreditCardDTO } from "../modules/common/dto/CreditCardDTO";
import { PartnerService } from "../modules/partner/partner.service";
import { getMockPartnerServiceWithDefaults } from "../modules/partner/mocks/mock.partner.service";
import { Partner } from "../modules/partner/domain/Partner";
import { X_NOBA_API_KEY } from "../modules/auth/domain/HeaderConstants";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;
  let mockCurrencyService: CurrencyService;
  let mockCreditCardService: CreditCardService;
  let mockLocationService: LocationService;
  let mockPartnerService: PartnerService;
  let mockConfigurationProviderService: ConfigurationProviderService;

  beforeEach(async () => {
    appService = getMockAppServiceWithDefaults();
    mockCurrencyService = getMockCurrencyServiceWithDefaults();
    mockCreditCardService = getMockCreditCardServiceWithDefaults();
    mockLocationService = getMockLocationServiceWithDefaults();
    mockPartnerService = getMockPartnerServiceWithDefaults();
    mockConfigurationProviderService = getMockConfigurationProviderServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useFactory: () => instance(appService),
        },
        {
          provide: CurrencyService,
          useFactory: () => instance(mockCurrencyService),
        },
        {
          provide: CreditCardService,
          useFactory: () => instance(mockCreditCardService),
        },
        {
          provide: LocationService,
          useFactory: () => instance(mockLocationService),
        },
        {
          provide: PartnerService,
          useFactory: () => instance(mockPartnerService),
        },
        {
          provide: ConfigurationProviderService,
          useFactory: () => instance(mockConfigurationProviderService),
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  const usWithoutSubdivisionData = {
    countryName: "United States",
    countryISOCode: "US",
    alternateCountryName: "USA",
    countryFlagIconPath: "xyz",
  };

  const usWithSubdivisionData = {
    countryName: "United States",
    countryISOCode: "US",
    alternateCountryName: "USA",
    countryFlagIconPath: "xyz",
    subdivisions: [{ code: "WA", name: "Washington", supported: true }],
  };

  describe("appHealth()", () => {
    it("should return success string", async () => {
      expect(appController.appHealth()).toEqual("We're up and running. How are you?");
    });
  });

  describe("supportedCryptocurrencies()", () => {
    const partnerID = "Partner-12345";
    const apiKey = "1234567890";
    const partner = Partner.createPartner({
      name: "Partner 12345",
      apiKey: apiKey,
      config: {
        cryptocurrencyAllowList: ["ETH"],
        viewOtherWallets: true,
        privateWallets: false,
        bypassLogonOTP: false,
        bypassWalletOTP: false,
        fees: {
          creditCardFeeDiscountPercent: 0,
          networkFeeDiscountPercent: 0,
          nobaFeeDiscountPercent: 0,
          processingFeeDiscountPercent: 0,
          spreadDiscountPercent: 0,
          takeRate: 0,
        },
      },
    });

    it("should return the list of supported cryptocurrencies", async () => {
      when(mockCurrencyService.getSupportedCryptocurrencies(anything())).thenResolve([
        {
          name: "Ethereum",
          ticker: "ETH",
          precision: 6,
          iconPath: "xyz",
        },
      ]);

      when(mockPartnerService.getPartnerFromApiKey(apiKey)).thenResolve(partner);
      const result = await appController.supportedCryptocurrencies({ [X_NOBA_API_KEY.toLocaleLowerCase()]: apiKey });

      // Just ensuring something's returned. Other unit tests are responsible for exactly what's returned.
      expect(result.length).toEqual(1);
    });
  });

  describe("supportedFiatCurrencies()", () => {
    it("should return the list of supported fiat currencies", async () => {
      when(mockCurrencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          name: "US Dollar",
          ticker: "USD",
          precision: 2,
          iconPath: "xyz",
        },
      ]);

      const result = await appController.supportedFiatCurrencies();
      // Just ensuring something's returned. Other unit tests are responsible for exactly what's returned.
      expect(result.length).toEqual(1);
    });
  });

  describe("getSupportedCountries()", () => {
    it("should return the list of supported countries with subdivision data (default)", async () => {
      when(mockLocationService.getLocations(anything())).thenReturn([usWithSubdivisionData]);

      const result = await appController.getSupportedCountries();
      expect(result.length).toEqual(1);

      const us = result.filter(item => item.countryISOCode === "US")[0];
      expect(us.subdivisions.length).toBeGreaterThan(0);
    });

    it("should return the list of supported countries with subdivision data (explicit)", async () => {
      when(mockLocationService.getLocations(anything())).thenReturn([usWithSubdivisionData]);

      const result = await appController.getSupportedCountries("true");
      expect(result.length).toEqual(1);
      // Check one entry for whether or not subdivision data exists
      const us = result.filter(item => item.countryISOCode === "US")[0];
      expect(us.subdivisions.length).toBeGreaterThan(0);
    });

    it("should return the list of supported countries without subdivision data", async () => {
      when(mockLocationService.getLocations(anything())).thenReturn([usWithoutSubdivisionData]);

      const result = await appController.getSupportedCountries("false");
      expect(result.length).toEqual(1);
      // Check one entry for whether or not subdivision data exists
      const us = result.filter(item => item.countryISOCode === "US")[0];
      expect(us.subdivisions).toBeUndefined();
    });
  });

  describe("getSupportedCountry()", () => {
    it("should return a single country without subdivision data", async () => {
      when(mockLocationService.getLocationDetails("US")).thenReturn(usWithoutSubdivisionData);

      const result = await appController.getSupportedCountry("US");
      expect(result).toEqual(usWithoutSubdivisionData);
    });

    it("should throw NotFound when country doesn't exist", async () => {
      when(mockLocationService.getLocationDetails("ZZ")).thenThrow(new NotFoundException());

      expect(async () => {
        const result = await appController.getSupportedCountry("ZZ");
      }).rejects.toThrow(NotFoundException);
    });
  });

  describe("getCommonConfigurations()", () => {
    it("should return the configuration", async () => {
      const commonConfig = {
        lowAmountThreshold: 50,
        highAmountThreshold: 500,
        cryptoImageBaseUrl: "abc",
        fiatImageBaseUrl: "xyz",
      };
      when(mockConfigurationProviderService.getConfigurations()).thenReturn(commonConfig);

      const result = await appController.getCommonConfigurations();
      expect(result).toEqual(commonConfig);
    });

    it("should throw NotFound when configs can't be found", async () => {
      when(mockConfigurationProviderService.getConfigurations()).thenThrow(new NotFoundException());

      expect(async () => {
        const result = await appController.getCommonConfigurations();
      }).rejects.toThrow(NotFoundException);
    });
  });

  describe("getCreditCardBIN()", () => {
    it("should return the BIN data requested", async () => {
      const testBIN: CreditCardDTO = {
        bin: "123456",
        issuer: "Bank of Noba",
        network: "Visa",
        type: CardType.CREDIT,
        supported: BINValidity.SUPPORTED,
        digits: 16,
        cvvDigits: 3,
      };
      when(mockCreditCardService.getBINDetails("123456")).thenResolve(testBIN);

      const result = await appController.getCreditCardBIN("123456");
      expect(result).toEqual(testBIN);
    });

    it("should throw NotFound when credit card BIN can't be found", async () => {
      when(mockCreditCardService.getBINDetails("XXX")).thenReturn(null);

      expect(async () => {
        const result = await appController.getCreditCardBIN("XXX");
      }).rejects.toThrow(NotFoundException);
    });
  });
});
