import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ExchangeRate, InputExchangeRate } from "../domain/ExchangeRate";
import { getMockExchangeRateRepoWithDefaults } from "../mocks/mock.exchangerate.repo";
import { IExchangeRateRepo } from "../repo/exchangerate.repo";
import { SQLExchangeRateRepo } from "../repo/sql.exchangerate.repo";
import {
  InvalidDatabaseRecordException,
  DatabaseInternalErrorException,
} from "../../../core/exception/CommonAppException";
import * as ExchangeRateFunctionsForMocking from "../domain/ExchangeRate";

describe("SQLExchangeRateRepo", () => {
  let exchangeRateRepo: IExchangeRateRepo;
  let prismaService: PrismaService;
  let app: TestingModule;

  jest.setTimeout(30000);

  beforeAll(async () => {
    exchangeRateRepo = getMockExchangeRateRepoWithDefaults();
    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [SQLExchangeRateRepo, PrismaService],
    }).compile();

    exchangeRateRepo = app.get<SQLExchangeRateRepo>(SQLExchangeRateRepo);
    prismaService = app.get<PrismaService>(PrismaService);

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2020, 3, 1));
  });

  afterAll(async () => {
    jest.useRealTimers();
    await app.close();
  });

  beforeEach(async () => {
    await prismaService.exchangeRate.deleteMany(); // clear all the dependencies

    jest.restoreAllMocks();
  });

  describe("createExchangeRate", () => {
    it("Should create an exchange rate with no error, then perform a lookup", async () => {
      const inputExchangeRate = getInputExchangeRate();

      const createdExchangeRate = await exchangeRateRepo.createExchangeRate(inputExchangeRate);
      expect(createdExchangeRate).not.toBeNull();
      expect(createdExchangeRate).toStrictEqual({
        id: expect.any(String),
        createdTimestamp: expect.any(Date),
        updatedTimestamp: expect.any(Date),
        numeratorCurrency: inputExchangeRate.numeratorCurrency,
        denominatorCurrency: inputExchangeRate.denominatorCurrency,
        bankRate: inputExchangeRate.bankRate,
        nobaRate: inputExchangeRate.nobaRate,
        expirationTimestamp: inputExchangeRate.expirationTimestamp,
      });

      // Then find it
      const exchangeRateFound = await exchangeRateRepo.getExchangeRateForCurrencyPair("USD", "COP", new Date());

      expect(exchangeRateFound).not.toBeNull();
      expect(exchangeRateFound).toStrictEqual({
        id: expect.any(String),
        createdTimestamp: expect.any(Date),
        updatedTimestamp: expect.any(Date),
        numeratorCurrency: inputExchangeRate.numeratorCurrency,
        denominatorCurrency: inputExchangeRate.denominatorCurrency,
        bankRate: inputExchangeRate.bankRate,
        nobaRate: inputExchangeRate.nobaRate,
        expirationTimestamp: inputExchangeRate.expirationTimestamp,
      });
    });

    it("Should throw a InvalidDatabaseRecordException if creation succeeds but the object fails Joi validation", async () => {
      const inputExchangeRate = getInputExchangeRate();

      jest.spyOn(ExchangeRateFunctionsForMocking, "validateSavedExchangeRate").mockImplementation(() => {
        throw new Error("Error");
      });

      expect(async () => await exchangeRateRepo.createExchangeRate(inputExchangeRate)).rejects.toThrow(
        InvalidDatabaseRecordException,
      );
    });

    it("Should throw a DatabaseInternalErrorException if creation fails", async () => {
      jest.spyOn(prismaService.exchangeRate, "create").mockImplementation(() => {
        throw new Error("Error");
      });

      const inputExchangeRate = getInputExchangeRate();

      expect(async () => await exchangeRateRepo.createExchangeRate(inputExchangeRate)).rejects.toThrow(
        DatabaseInternalErrorException,
      );
    });

    it("Should ensure that all required fields are provided", async () => {
      await exchangeRateRepo
        .createExchangeRate({
          numeratorCurrency: "USD",
          denominatorCurrency: "COP",
          bankRate: 5000,
          nobaRate: 4000,
          expirationTimestamp: undefined,
        })
        .catch(error => {
          expect(error.message).toBe('"expirationTimestamp" is required');
        });

      await exchangeRateRepo
        .createExchangeRate({
          numeratorCurrency: "USD",
          denominatorCurrency: "COP",
          bankRate: 5000,
          nobaRate: undefined,
          expirationTimestamp: new Date(),
        })
        .catch(error => {
          expect(error.message).toBe('"nobaRate" is required');
        });

      await exchangeRateRepo
        .createExchangeRate({
          numeratorCurrency: "USD",
          denominatorCurrency: "COP",
          bankRate: undefined,
          nobaRate: 4000,
          expirationTimestamp: new Date(),
        })
        .catch(error => {
          expect(error.message).toBe('"bankRate" is required');
        });

      await exchangeRateRepo
        .createExchangeRate({
          numeratorCurrency: "USD",
          denominatorCurrency: undefined,
          bankRate: 5000,
          nobaRate: 4000,
          expirationTimestamp: new Date(),
        })
        .catch(error => {
          expect(error.message).toBe('"denominatorCurrency" is required');
        });

      await exchangeRateRepo
        .createExchangeRate({
          numeratorCurrency: undefined,
          denominatorCurrency: "COP",
          bankRate: 5000,
          nobaRate: 4000,
          expirationTimestamp: new Date(),
        })
        .catch(error => {
          expect(error.message).toBe('"numeratorCurrency" is required');
        });
    });

    it("Should validate proper currency field lengths", async () => {
      await exchangeRateRepo
        .createExchangeRate({
          numeratorCurrency: "XXXX",
          denominatorCurrency: "COP",
          bankRate: 5000,
          nobaRate: 4000,
          expirationTimestamp: new Date(),
        })
        .catch(error => {
          expect(error.message).toBe('"numeratorCurrency" length must be 3 characters long');
        });

      await exchangeRateRepo
        .createExchangeRate({
          numeratorCurrency: "USD",
          denominatorCurrency: "XXXX",
          bankRate: 5000,
          nobaRate: 4000,
          expirationTimestamp: new Date(),
        })
        .catch(error => {
          expect(error.message).toBe('"denominatorCurrency" length must be 3 characters long');
        });
    });
  });

  describe("getExchangeRateForCurrencyPair", () => {
    it("Should create several exchange rates then query to get the latest", async () => {
      const inputExchangeRate = getInputExchangeRate();

      //await new Promise(r => setTimeout(r, 2000));

      const createdExchangeRate1 = await exchangeRateRepo.createExchangeRate({
        ...inputExchangeRate,
        denominatorCurrency: "TST",
        bankRate: 1,
        expirationTimestamp: new Date(Date.now() + 1000000), // This one should be the earliest
      });
      expect(createdExchangeRate1).not.toBeNull();

      const createdExchangeRate2 = await exchangeRateRepo.createExchangeRate({
        ...inputExchangeRate,
        denominatorCurrency: "TST",
        bankRate: 2,
        expirationTimestamp: new Date(Date.now() + 5000000), // This one should be the latest
      });
      expect(createdExchangeRate2).not.toBeNull();

      const createdExchangeRate3 = await exchangeRateRepo.createExchangeRate({
        ...inputExchangeRate,
        denominatorCurrency: "TST",
        bankRate: 3,
        expirationTimestamp: new Date(Date.now() - 30000), // Expires in the past to ensure we don't just always retrieve the latest
      });
      expect(createdExchangeRate3).not.toBeNull();

      // Then find the latest (should be createdExchangeRate2)
      const exchangeRateFound = await exchangeRateRepo.getExchangeRateForCurrencyPair("USD", "TST", new Date());

      expect(exchangeRateFound).not.toBeNull();
      expect(exchangeRateFound).toStrictEqual({
        id: createdExchangeRate2.id,
        createdTimestamp: createdExchangeRate2.createdTimestamp,
        updatedTimestamp: createdExchangeRate2.updatedTimestamp,
        numeratorCurrency: createdExchangeRate2.numeratorCurrency,
        denominatorCurrency: createdExchangeRate2.denominatorCurrency,
        bankRate: createdExchangeRate2.bankRate,
        nobaRate: createdExchangeRate2.nobaRate,
        expirationTimestamp: createdExchangeRate2.expirationTimestamp,
      });
    });

    it("Should return null if exchange rate is not found", async () => {
      const exchangeRateFound = await exchangeRateRepo.getExchangeRateForCurrencyPair("XXX", "YYY", new Date());

      expect(exchangeRateFound).toBeNull();
    });

    it("Should return null if an exchange rate exists but expired", async () => {
      const inputExchangeRate = getInputExchangeRate();
      const createdExchangeRate = await exchangeRateRepo.createExchangeRate({
        ...inputExchangeRate,
        bankRate: 1,
        expirationTimestamp: new Date(Date.now() - 1000), // In the past
      });
      expect(createdExchangeRate).not.toBeNull();

      const exchangeRateFound = await exchangeRateRepo.getExchangeRateForCurrencyPair(
        inputExchangeRate.numeratorCurrency,
        inputExchangeRate.denominatorCurrency,
        new Date(),
      );

      expect(exchangeRateFound).toBeNull();
    });

    it("Should return null if an exception is thrown", async () => {
      jest.spyOn(prismaService.exchangeRate, "findFirst").mockImplementation(() => {
        throw new Error("Error");
      });

      const exchangeRateFound = await exchangeRateRepo.getExchangeRateForCurrencyPair("XXX", "YYY", new Date());

      expect(exchangeRateFound).toBeNull();
    });
  });

  const getInputExchangeRate = (): InputExchangeRate => {
    const expirationTimestamp = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    return {
      numeratorCurrency: "USD",
      denominatorCurrency: "COP",
      bankRate: 5000,
      nobaRate: 4000,
      expirationTimestamp: expirationTimestamp,
    };
  };
});
