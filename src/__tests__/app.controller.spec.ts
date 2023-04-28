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
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BINValidity, CardType, CreditCardDTO } from "../modules/common/dto/CreditCardDTO";
import { MonoService } from "../modules/mono/public/mono.service";
import { getMockMonoServiceWithDefaults } from "../modules/mono/public/mocks/mock.mono.service";
import { VerificationService } from "../modules/verification/verification.service";
import { getMockVerificationServiceWithDefaults } from "../modules/verification/mocks/mock.verification.service";
import { HealthCheckStatus } from "../core/domain/HealthCheckTypes";
import { ALLOWED_DEPTH } from "../modules/common/dto/HealthCheckQueryDTO";
import { WorkflowExecutor } from "../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../infra/temporal/mocks/mock.workflow.executor";
import { IdentificationService } from "../modules/common/identification.service";
import { getMockIdentificationServiceWithDefaults } from "../modules/common/mocks/mock.identification.service";
import { CircleService } from "../modules/circle/public/circle.service";
import { getMockCircleServiceWithDefaults } from "../modules/circle/public/mocks/mock.circle.service";
import { ExchangeRateService } from "../modules/exchangerate/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../modules/exchangerate/mocks/mock.exchangerate.service";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;
  let mockCurrencyService: CurrencyService;
  let mockExchangeRateService: ExchangeRateService;
  let mockCreditCardService: CreditCardService;
  let mockLocationService: LocationService;
  let mockConfigurationProviderService: ConfigurationProviderService;
  let mockMonoService: MonoService;
  let mockVerificationService: VerificationService;
  let mockCircleService: CircleService;
  let mockWorkflowExecutor: WorkflowExecutor;
  let mockIdentificationService: IdentificationService;

  beforeEach(async () => {
    appService = getMockAppServiceWithDefaults();
    mockCurrencyService = getMockCurrencyServiceWithDefaults();
    mockExchangeRateService = getMockExchangeRateServiceWithDefaults();
    mockCreditCardService = getMockCreditCardServiceWithDefaults();
    mockLocationService = getMockLocationServiceWithDefaults();
    mockConfigurationProviderService = getMockConfigurationProviderServiceWithDefaults();
    mockMonoService = getMockMonoServiceWithDefaults();
    mockVerificationService = getMockVerificationServiceWithDefaults();
    mockCircleService = getMockCircleServiceWithDefaults();
    mockWorkflowExecutor = getMockWorkflowExecutorWithDefaults();
    mockIdentificationService = getMockIdentificationServiceWithDefaults();

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
          provide: ConfigurationProviderService,
          useFactory: () => instance(mockConfigurationProviderService),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(mockExchangeRateService),
        },
        {
          provide: MonoService,
          useFactory: () => instance(mockMonoService),
        },
        {
          provide: VerificationService,
          useFactory: () => instance(mockVerificationService),
        },
        {
          provide: CircleService,
          useFactory: () => instance(mockCircleService),
        },
        {
          provide: WorkflowExecutor,
          useFactory: () => instance(mockWorkflowExecutor),
        },
        {
          provide: IdentificationService,
          useFactory: () => instance(mockIdentificationService),
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
    alpha3ISOCode: "USA",
    dialingPrefix: "1",
  };

  const usWithSubdivisionData = {
    countryName: "United States",
    countryISOCode: "US",
    alternateCountryName: "USA",
    countryFlagIconPath: "xyz",
    alpha3ISOCode: "USA",
    dialingPrefix: "1",
    subdivisions: [{ code: "WA", name: "Washington", supported: true }],
  };

  describe("appHealth()", () => {
    it("should return health for all clients", async () => {
      when(mockVerificationService.getHealth()).thenResolve({ status: HealthCheckStatus.OK });
      when(mockCircleService.checkCircleHealth()).thenResolve({ status: HealthCheckStatus.OK });
      when(mockMonoService.checkMonoHealth()).thenResolve({ status: HealthCheckStatus.OK });
      when(mockWorkflowExecutor.getHealth()).thenResolve({ status: HealthCheckStatus.OK });

      const result = await appController.appHealth({ depth: ALLOWED_DEPTH.DEEP });
      expect(result).toStrictEqual({
        serverStatus: HealthCheckStatus.OK,
        sardineStatus: HealthCheckStatus.OK,
        circleStatus: HealthCheckStatus.OK,
        monoStatus: HealthCheckStatus.OK,
        temporalStatus: HealthCheckStatus.OK,
      });
    });

    it("should report the corresponding client as UNAVAILABLE when it is down", async () => {
      when(mockVerificationService.getHealth()).thenResolve({ status: HealthCheckStatus.OK });
      when(mockCircleService.checkCircleHealth()).thenResolve({ status: HealthCheckStatus.UNAVAILABLE });
      when(mockMonoService.checkMonoHealth()).thenResolve({ status: HealthCheckStatus.OK });
      when(mockWorkflowExecutor.getHealth()).thenResolve({ status: HealthCheckStatus.OK });

      const result = await appController.appHealth({ depth: ALLOWED_DEPTH.DEEP });
      expect(result).toStrictEqual({
        serverStatus: HealthCheckStatus.OK,
        sardineStatus: HealthCheckStatus.OK,
        circleStatus: HealthCheckStatus.UNAVAILABLE,
        monoStatus: HealthCheckStatus.OK,
        temporalStatus: HealthCheckStatus.OK,
      });
    });

    it("should return serverStatus when depth is SHALLOW", async () => {
      const result = await appController.appHealth({ depth: ALLOWED_DEPTH.SHALLOW });
      expect(result.serverStatus).toBe(HealthCheckStatus.OK);
      expect(result.circleStatus).toBeUndefined();
      expect(result.monoStatus).toBeUndefined();
      expect(result.sardineStatus).toBeUndefined();
      expect(result.temporalStatus).toBeUndefined();
    });
  });

  describe("supportedCryptocurrencies()", () => {
    it("should return the list of supported cryptocurrencies", async () => {
      when(mockCurrencyService.getSupportedCryptocurrencies(anything())).thenResolve([
        {
          name: "Ethereum",
          ticker: "ETH",
          precision: 6,
          iconPath: "xyz",
        },
      ]);

      const result = await appController.supportedCryptocurrencies({});

      // Just ensuring something's returned. Other unit tests are responsible for exactly what's returned.
      //expect(result.length).toEqual(1);
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

  describe("getSupportedBanks", () => {
    it("should return list of supported banks", async () => {
      when(mockMonoService.getSupportedBanks()).thenResolve([
        {
          code: "007",
          id: "bank_705urpPYaZjD0DYLIZqRee",
          name: "Bancolombia",
          supported_account_types: ["savings_account", "checking_account"],
        },
        {
          code: "051",
          id: "bank_7BcCOfq1cz3JnJhe5Icsf0",
          name: "Davivienda Bank",
          supported_account_types: ["savings_account", "checking_account"],
        },
      ]);

      const response = await appController.getSupportedBanks();
      expect(response).toHaveLength(2);
      expect(response[0].name).toBe("Bancolombia");
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

  describe("getIdentificationTypes()", () => {
    it("should return the list of identification types", async () => {
      const northAmericanCountries = [
        {
          countryCode: "US",
          identificationTypes: [
            {
              name: "Driver's License",
              type: "DRIVERS_LICENSE",
              regex: "^[A-Z0-9]{6,8}$",
              maxLength: 8,
            },
          ],
        },
        {
          countryCode: "CA",
          identificationTypes: [
            {
              name: "Driver's License",
              type: "DRIVERS_LICENSE",
              regex: "^[A-Z0-9]{6,8}$",
              maxLength: 8,
            },
          ],
        },
      ];

      when(mockIdentificationService.getIdentificationTypes()).thenResolve(northAmericanCountries);

      const result = await appController.getIdentificationTypes();
      expect(result.length).toEqual(2);
      expect(result[0]).toEqual(northAmericanCountries[0]);
      expect(result[1]).toEqual(northAmericanCountries[1]);
    });

    it("should return a single country's identification types when filtering by country", async () => {
      const northAmericanCountries = [
        {
          countryCode: "US",
          identificationTypes: [
            {
              name: "Driver's License",
              type: "DRIVERS_LICENSE",
              regex: "^[A-Z0-9]{6,8}$",
              maxLength: 8,
            },
          ],
        },
        {
          countryCode: "CA",
          identificationTypes: [
            {
              name: "Driver's License",
              type: "DRIVERS_LICENSE",
              regex: "^[A-Z0-9]{6,8}$",
              maxLength: 8,
            },
          ],
        },
      ];

      when(mockIdentificationService.getIdentificationTypesForCountry("US")).thenResolve(northAmericanCountries[0]);

      const result = await appController.getIdentificationTypes("US");
      expect(result.length).toEqual(1);
      expect(result[0]).toEqual(northAmericanCountries[0]);
    });

    it("should throw not found error when country doesn't exist", async () => {
      when(mockIdentificationService.getIdentificationTypesForCountry("ZZ")).thenThrow(new NotFoundException());

      expect(appController.getIdentificationTypes("ZZ")).rejects.toThrow(NotFoundException);
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

  describe("getExchangeRates()", () => {
    it("should return the requested exchange rate", async () => {
      when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve({
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date(),
      });

      const result = await appController.getExchangeRate("USD", "COP");

      // Just ensuring something's returned. Other unit tests are responsible for exactly what's returned.
      expect(result).not.toBeNull();
    });

    it("should throw NotFoundException if the currency pair doesn't exist", async () => {
      when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(null);

      expect(async () => {
        await appController.getExchangeRate("USD", "COP");
      }).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if the numerator currency is not provided", async () => {
      expect(async () => {
        await appController.getExchangeRate(null, "COP");
      }).rejects.toThrow(BadRequestException);

      expect(async () => {
        await appController.getExchangeRate(undefined, "COP");
      }).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if the denominator currency is not provided", async () => {
      expect(async () => {
        await appController.getExchangeRate("USD", null);
      }).rejects.toThrow(BadRequestException);

      expect(async () => {
        await appController.getExchangeRate(undefined, null);
      }).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if either currency is not 3 characters", async () => {
      expect(async () => {
        await appController.getExchangeRate("US", "COP");
      }).rejects.toThrow(BadRequestException);

      expect(async () => {
        await appController.getExchangeRate("USD", "CO");
      }).rejects.toThrow(BadRequestException);
    });
  });
});
