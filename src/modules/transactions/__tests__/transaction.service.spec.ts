const FAKE_VALID_WALLET = "fake-valid-wallet";

jest.mock("multicoin-address-validator", () => ({
  validate: jest.fn((walletAddress, _) => {
    if (walletAddress === FAKE_VALID_WALLET) return true;
    return false;
  }),
}));

import { Test, TestingModule } from "@nestjs/testing";
import mockAxios from "jest-mock-axios";
import { anyString, anything, deepEqual, instance, reset, verify, when } from "ts-mockito";
import {
  DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE,
  FIXED_CREDIT_CARD_FEE,
  FLAT_FEE_DOLLARS,
  NOBA_CONFIG_KEY,
  NOBA_TRANSACTION_CONFIG_KEY,
  SLIPPAGE_ALLOWED_PERCENTAGE,
  SPREAD_PERCENTAGE,
} from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { CryptoWallet } from "../../../modules/consumer/domain/CryptoWallet";
import { PaymentMethod } from "../../../modules/consumer/domain/PaymentMethod";
import { PendingTransactionValidationStatus } from "../../../modules/consumer/domain/Types";
import { KYCStatus, PaymentMethodStatus, WalletStatus } from "../../../modules/consumer/domain/VerificationStatus";
import { CurrencyService } from "../../common/currency.service";
import { CurrencyType } from "../../common/domain/Types";
import { EmailService } from "../../common/email.service";
import { getMockCurrencyServiceWithDefaults } from "../../common/mocks/mock.currency.service";
import { getMockEmailServiceWithDefaults } from "../../common/mocks/mock.email.service";
import { ConsumerService } from "../../consumer/consumer.service";
import { Consumer } from "../../consumer/domain/Consumer";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { getMockVerificationServiceWithDefaults } from "../../verification/mocks/mock.verification.service";
import { VerificationService } from "../../verification/verification.service";
import { AssetServiceFactory } from "../assets/asset.service.factory";
import { UserLimits } from "../domain/Limits";
import { Transaction } from "../domain/Transaction";
import { TransactionAllowedStatus } from "../domain/TransactionAllowedStatus";
import { TransactionStatus, TransactionType } from "../domain/Types";
import { CheckTransactionDTO } from "../dto/CheckTransactionDTO";
import { ConsumerLimitsDTO } from "../dto/ConsumerLimitsDTO";
import { TransactionQuoteDTO } from "../dto/TransactionQuoteDTO";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQueryDTO";
import { LimitsService } from "../limits.service";
import {
  getMockAssetServiceFactoryWithDefaultAssetService,
  getMockAssetServiceWithDefaults,
} from "../mocks/mock.asset.service";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.transactions.repo";
import { getMockZerohashServiceWithDefaults } from "../mocks/mock.zerohash.service";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { ZeroHashService } from "../zerohash.service";
import { PartnerService } from "../../partner/partner.service";
import { getMockPartnerServiceWithDefaults } from "../../../modules/partner/mocks/mock.partner.service";
import { BadRequestException } from "@nestjs/common";
import { AssetService } from "../assets/asset.service";
import { NobaQuote } from "../domain/AssetTypes";
import { Partner } from "../../../modules/partner/domain/Partner";
import { WebhookType } from "../../../modules/partner/domain/WebhookTypes";
import { CreateTransactionDTO } from "../dto/CreateTransactionDTO";
import { TransactionMapper } from "../mapper/TransactionMapper";

const defaultEnvironmentVariables = {
  [NOBA_CONFIG_KEY]: {
    [NOBA_TRANSACTION_CONFIG_KEY]: {
      [SPREAD_PERCENTAGE]: 0.6,
      [FLAT_FEE_DOLLARS]: 0,
      [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0,
      [FIXED_CREDIT_CARD_FEE]: 0,
      [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
    },
  },
};

describe("TransactionService", () => {
  let transactionRepo: ITransactionRepo;
  let limitsService: LimitsService;
  let consumerService: ConsumerService;
  let transactionService: TransactionService;
  let zerohashService: ZeroHashService;
  let verificationService: VerificationService;
  let currencyService: CurrencyService;
  let emailService: EmailService;
  let partnerService: PartnerService;
  let assetServiceFactory: AssetServiceFactory;
  let assetService: AssetService;
  let transactionMapper: TransactionMapper;

  const userId = "1234567890";
  const consumer: Consumer = Consumer.createConsumer({
    _id: userId,
    email: "test@noba.com",
    partners: [
      {
        partnerID: "partner-1",
      },
    ],
  });

  const setupTestModule = async (environmentVariables: Record<string, any>): Promise<void> => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    zerohashService = getMockZerohashServiceWithDefaults();
    currencyService = getMockCurrencyServiceWithDefaults();
    verificationService = getMockVerificationServiceWithDefaults();
    emailService = getMockEmailServiceWithDefaults();
    partnerService = getMockPartnerServiceWithDefaults();
    assetServiceFactory = getMockAssetServiceFactoryWithDefaultAssetService();
    transactionMapper = new TransactionMapper();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [
        DBProvider,
        LimitsService,
        TransactionService,
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: "TransactionRepo",
          useFactory: () => instance(transactionRepo),
        },
        {
          provide: ZeroHashService,
          useFactory: () => instance(zerohashService),
        },
        {
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
        {
          provide: VerificationService,
          useFactory: () => instance(verificationService),
        },
        {
          provide: EmailService,
          useFactory: () => instance(emailService),
        },
        {
          provide: PartnerService,
          useFactory: () => instance(partnerService),
        },
        {
          provide: AssetServiceFactory,
          useFactory: () => instance(assetServiceFactory),
        },
      ],
    }).compile();

    limitsService = app.get<LimitsService>(LimitsService);
    transactionService = app.get<TransactionService>(TransactionService);

    assetService = getMockAssetServiceWithDefaults();
    when(assetServiceFactory.getAssetService(anyString())).thenReturn(instance(assetService));
  };

  // it("Should return transaction quote", async () => {
  //   await setupTestModule(defaultEnvironmentVariables);

  //   const result: TransactionQuoteDTO = await transactionService.getTransactionQuote({
  //     fiatCurrencyCode: "USD",
  //     cryptoCurrencyCode: "ETH",
  //     fixedSide: CurrencyType.FIAT,
  //     fixedAmount: 100,
  //   });

  //   // TODO Ask in code review on how to mock exactly, right now the result is giving me undefined
  //   // expect(result.fiatCurrencyCode).toBe("USD");
  //   // expect(result.cryptoCurrencyCode).toBe("ETH");
  //   // expect(result.fixedSide).toBe("fiat");
  //   // expect(result.fixedAmount).toBe(100);
  //   // expect(result.quotedAmount).toBeInstanceOf(number);
  //   // expect(result.processingFee).toBeInstanceOf(number);
  // });

  const limits: UserLimits = {
    dailyLimit: 200,
    monthlyLimit: 2000,
    weeklyLimit: 1000,
    transactionLimit: 0,
    totalLimit: 10000,
    minTransaction: 50,
    maxTransaction: 500,
  };

  it("Should not be below the minimum", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 49, limits);
    expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_SMALL);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });

  it("Should not be above the maximum", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 501, limits);
    expect(result.status).toBe(TransactionAllowedStatus.TRANSACTION_TOO_LARGE);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });

  it("Should not exceed the exact monthly maximum", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2000);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(0);
  });

  it("Should not exceed the monthly maximum even when some is left", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1985);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(15);
  });

  it("Should not exceed the monthly maximum if maximum is negative", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(2015);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 50, limits);
    expect(result.status).toBe(TransactionAllowedStatus.MONTHLY_LIMIT_REACHED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(0);
  });

  it("Is within range so should be allowed", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

    const result: CheckTransactionDTO = await limitsService.canMakeTransaction(consumer, 200, limits);
    expect(result.status).toBe(TransactionAllowedStatus.ALLOWED);
    expect(result.rangeMin).toBe(50);
    expect(result.rangeMax).toBe(500);
  });

  it("Returns limits for the user", async () => {
    await setupTestModule(defaultEnvironmentVariables);

    when(transactionRepo.getMonthlyUserTransactionAmount(userId)).thenResolve(1000);

    const result: ConsumerLimitsDTO = await limitsService.getConsumerLimits(consumer, limits);
    expect(result.minTransaction).toBe(50);
    expect(result.maxTransaction).toBe(500);
    expect(result.monthly.max).toBe(2000);
    expect(result.monthly.used).toBe(1000);
    expect(result.monthly.period).toBe(30);
  });

  describe("withinSlippage()", () => {
    const paymentAmount = 500;
    const slippageAllowed = 0.02;
    const environmentVariables = {
      [NOBA_CONFIG_KEY]: {
        [NOBA_TRANSACTION_CONFIG_KEY]: {
          [SLIPPAGE_ALLOWED_PERCENTAGE]: slippageAllowed,
        },
      },
    };

    it("Should allow a transaction with higher quoted amount but still within the slippage tolerance", async () => {
      await setupTestModule(environmentVariables);

      const withinSlippage = transactionService.withinSlippage(
        paymentAmount,
        paymentAmount - paymentAmount * (slippageAllowed / 2),
      );
      expect(withinSlippage).toBe(true);
    });

    it("Should allow a transaction with lower quoted amount but still within the slippage tolerance", async () => {
      await setupTestModule(environmentVariables);

      const withinSlippage = transactionService.withinSlippage(
        paymentAmount,
        paymentAmount - paymentAmount * (-slippageAllowed / 2),
      );
      expect(withinSlippage).toBe(true);
    });

    it("Should not allow a transaction with higher quoted amount but outside slippage tolerance", async () => {
      await setupTestModule(environmentVariables);

      const withinSlippage = transactionService.withinSlippage(
        paymentAmount,
        paymentAmount - paymentAmount * (slippageAllowed * 2),
      );
      expect(withinSlippage).toBe(false);
    });

    it("Should not allow a transaction with lower quoted amount but outside slippage tolerance", async () => {
      await setupTestModule(environmentVariables);

      const withinSlippage = transactionService.withinSlippage(
        paymentAmount,
        paymentAmount - paymentAmount * (-slippageAllowed * 2),
      );
      expect(withinSlippage).toBe(false);
    });
  });

  /*describe("getTransactionQuote() - FIAT side fixed:", () => {
    it("Noba spread percentage is taken into account correctly", async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: 0.6,
            [FLAT_FEE_DOLLARS]: 0,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0,
            [FIXED_CREDIT_CARD_FEE]: 0,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      const fiatAmountUSD = 100;
      const costPerUnit = 10;

      const expectedPriceToQuoteUSD = 62.5;

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: 0,
      });

      when(zerohashService.requestQuote("ETH", "USD", expectedPriceToQuoteUSD, CurrencyType.FIAT)).thenResolve({
        message: { price: 10 },
      });

      const receivedTransactionQuote: TransactionQuoteDTO = await transactionService.getTransactionQuote({
        cryptoCurrencyCode: "ETH",
        fiatCurrencyCode: "USD",
        fixedAmount: fiatAmountUSD,
        fixedSide: CurrencyType.FIAT,
      } as TransactionQuoteQueryDTO);

      expect(receivedTransactionQuote).toEqual({
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: fiatAmountUSD,
        quotedAmount: 6.25,
        processingFee: 0,
        networkFee: 0,
        nobaFee: 0,
        exchangeRate: 16,
      });
    });

    it("Noba flat fee is taken into account correctly", async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: 0,
            [FLAT_FEE_DOLLARS]: 9.5,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0,
            [FIXED_CREDIT_CARD_FEE]: 0,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      const fiatAmountUSD = 100;
      const costPerUnit = 10;

      const expectedPriceToQuoteUSD = 90.5;

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: 0,
      });
      when(zerohashService.requestQuote("ETH", "USD", expectedPriceToQuoteUSD, CurrencyType.FIAT)).thenResolve({
        message: { price: 10 },
      });

      const receivedTransactionQuote: TransactionQuoteDTO = await transactionService.getTransactionQuote({
        cryptoCurrencyCode: "ETH",
        fiatCurrencyCode: "USD",
        fixedAmount: fiatAmountUSD,
        fixedSide: CurrencyType.FIAT,
      } as TransactionQuoteQueryDTO);

      expect(receivedTransactionQuote).toEqual({
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: fiatAmountUSD,
        quotedAmount: 9.05,
        processingFee: 0,
        networkFee: 0,
        nobaFee: 9.5,
        exchangeRate: 10,
      });
    });

    // TODO(#306): Change the tests appropriately after fixing the name.
    it("Noba dynamic credit card fee is taken into account correctly", async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: 0,
            [FLAT_FEE_DOLLARS]: 0,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0.123, // really a fraction rather than percentage.
            [FIXED_CREDIT_CARD_FEE]: 0,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      const fiatAmountUSD = 100;
      const costPerUnit = 10;

      const expectedPriceToQuoteUSD = 87.7;

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: 0,
      });
      when(zerohashService.requestQuote("ETH", "USD", expectedPriceToQuoteUSD, CurrencyType.FIAT)).thenResolve({
        message: { price: 10 },
      });

      const receivedTransactionQuote: TransactionQuoteDTO = await transactionService.getTransactionQuote({
        cryptoCurrencyCode: "ETH",
        fiatCurrencyCode: "USD",
        fixedAmount: fiatAmountUSD,
        fixedSide: CurrencyType.FIAT,
      } as TransactionQuoteQueryDTO);

      expect(receivedTransactionQuote).toEqual({
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: fiatAmountUSD,
        quotedAmount: 8.77,
        processingFee: 12.3,
        networkFee: 0,
        nobaFee: 0,
        exchangeRate: 10,
      });
    });

    it("Noba fixed credit card fee is taken into account correctly", async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: 0,
            [FLAT_FEE_DOLLARS]: 0,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0, // really a fraction rather than percentage.
            [FIXED_CREDIT_CARD_FEE]: 0.5,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      const fiatAmountUSD = 100;
      const costPerUnit = 10;

      const expectedPriceToQuoteUSD = 99.5;

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: 0,
      });
      when(zerohashService.requestQuote("ETH", "USD", expectedPriceToQuoteUSD, CurrencyType.FIAT)).thenResolve({
        message: { price: 10 },
      });

      const receivedTransactionQuote: TransactionQuoteDTO = await transactionService.getTransactionQuote({
        cryptoCurrencyCode: "ETH",
        fiatCurrencyCode: "USD",
        fixedAmount: fiatAmountUSD,
        fixedSide: CurrencyType.FIAT,
      } as TransactionQuoteQueryDTO);

      expect(receivedTransactionQuote).toEqual({
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: fiatAmountUSD,
        quotedAmount: 9.95,
        processingFee: 0.5,
        networkFee: 0,
        nobaFee: 0,
        exchangeRate: 10,
      });
    });

    it("should operate dynamic credit card fee on original amount rather than reduced amount", async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: 0,
            [FLAT_FEE_DOLLARS]: 7.1,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0.12, // really a fraction rather than percentage.
            [FIXED_CREDIT_CARD_FEE]: 0,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      const fiatAmountUSD = 100;
      const costPerUnit = 10;

      const expectedPriceToQuoteUSD = 80.9;

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: 0,
      });
      when(zerohashService.requestQuote("ETH", "USD", expectedPriceToQuoteUSD, CurrencyType.FIAT)).thenResolve({
        message: { price: 10 },
      });

      const receivedTransactionQuote: TransactionQuoteDTO = await transactionService.getTransactionQuote({
        cryptoCurrencyCode: "ETH",
        fiatCurrencyCode: "USD",
        fixedAmount: fiatAmountUSD,
        fixedSide: CurrencyType.FIAT,
      } as TransactionQuoteQueryDTO);

      expect(receivedTransactionQuote).toEqual({
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: fiatAmountUSD,
        quotedAmount: 8.09,
        processingFee: 12,
        networkFee: 0,
        nobaFee: 7.1,
        exchangeRate: 10,
      });
    });

    it("should operate spread percentage on reduced amount rather than original amount", async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: 1,
            [FLAT_FEE_DOLLARS]: 7.5,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0.12, // really a fraction rather than percentage.
            [FIXED_CREDIT_CARD_FEE]: 0,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      const fiatAmountUSD = 100;
      const costPerUnit = 10;

      const expectedPriceToQuoteUSD = 40.25;

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: 0,
      });
      when(zerohashService.requestQuote("ETH", "USD", expectedPriceToQuoteUSD, CurrencyType.FIAT)).thenResolve({
        message: { price: 10 },
      });

      const receivedTransactionQuote: TransactionQuoteDTO = await transactionService.getTransactionQuote({
        cryptoCurrencyCode: "ETH",
        fiatCurrencyCode: "USD",
        fixedAmount: fiatAmountUSD,
        fixedSide: CurrencyType.FIAT,
      } as TransactionQuoteQueryDTO);

      expect(receivedTransactionQuote).toEqual({
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: fiatAmountUSD,
        quotedAmount: 4.025,
        processingFee: 12,
        networkFee: 0,
        nobaFee: 7.5,
        exchangeRate: 20,
      });
    });

    it("should take both dynamic & fixed credit card charges", async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SPREAD_PERCENTAGE]: 0,
            [FLAT_FEE_DOLLARS]: 0,
            [DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE]: 0.125, // really a fraction rather than percentage.
            [FIXED_CREDIT_CARD_FEE]: 1,
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      const fiatAmountUSD = 100;
      const costPerUnit = 10;

      const expectedPriceToQuoteUSD = 86.5;

      when(zerohashService.estimateNetworkFee("ETH", "USD")).thenResolve({
        cryptoCurrency: "ETH",
        feeInCrypto: 0,
        fiatCurrency: "USD",
        feeInFiat: 0,
      });
      when(zerohashService.requestQuote("ETH", "USD", expectedPriceToQuoteUSD, CurrencyType.FIAT)).thenResolve({
        message: { price: 10 },
      });

      const receivedTransactionQuote: TransactionQuoteDTO = await transactionService.getTransactionQuote({
        cryptoCurrencyCode: "ETH",
        fiatCurrencyCode: "USD",
        fixedAmount: fiatAmountUSD,
        fixedSide: CurrencyType.FIAT,
      } as TransactionQuoteQueryDTO);

      expect(receivedTransactionQuote).toEqual({
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: fiatAmountUSD,
        quotedAmount: 8.65,
        processingFee: 13.5,
        networkFee: 0,
        nobaFee: 0,
        exchangeRate: 10,
      });
    });
  }); */

  describe("validatePendingTransaction()", () => {
    const consumerID = "2222222222";
    const sessionKey = "12345";
    const paymentMethodID = "XXXXXXXXXX";
    const walletAddress = "1234567890";
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: consumerID,
      sessionKey: sessionKey,
      transactionStatus: TransactionStatus.PENDING,
      paymentMethodID: paymentMethodID,
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
      destinationWalletAddress: walletAddress,
      partnerID: "12345",
    });

    const paymentMethod: PaymentMethod = {
      first6Digits: "123456",
      last4Digits: "7890",
      imageUri: "xxx",
      paymentProviderID: "12345",
      paymentToken: paymentMethodID,
    };

    const cryptoWallet: CryptoWallet = {
      address: walletAddress,
      isEVMCompatible: false,
      status: undefined,
      partnerID: "1234",
    };

    const consumerNoPaymentMethod = Consumer.createConsumer({
      _id: consumerID,
      firstName: "Mock",
      lastName: "Consumer",
      partners: [{ partnerID: "partner-1" }],
      dateOfBirth: "1998-01-01",
      email: "mock@noba.com",
    });

    const consumer = Consumer.createConsumer({
      ...consumerNoPaymentMethod.props,
      paymentMethods: [paymentMethod],
      cryptoWallets: [cryptoWallet],
    });

    it("should fail if the payment method is unknown", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      reset(consumerService);
      const status = await transactionService.validatePendingTransaction(consumerNoPaymentMethod, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.FAIL);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
    });
    it("should pass if verification service returns KYC APPROVED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.APPROVED,
        walletStatus: WalletStatus.APPROVED,
        paymentMethodStatus: PaymentMethodStatus.APPROVED,
      });

      reset(consumerService);

      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      when(consumerService.addOrUpdateCryptoWallet(consumer, anything())).thenResolve(consumer);
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(consumer);

      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.PASS);
      const updatedWallet: CryptoWallet = {
        ...cryptoWallet,
        status: WalletStatus.APPROVED,
      };
      const updatedPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        status: PaymentMethodStatus.APPROVED,
      };

      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
      verify(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).times(1);
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
    });
    it("should fail if verification service returns KYC FLAGGED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.FLAGGED,
      });
      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.FAIL);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
    });
    it("should fail if wallet doesn't exist", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, "BadWallet")).thenReturn(cryptoWallet);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.FAIL);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
    });
    it("should fail if verification service returns KYC PENDING", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.PENDING,
      });

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.FAIL);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
    });
    it("should fail if verification service returns KYC REJECTED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.REJECTED,
      });
      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.FAIL);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
    });
    it("should update payment method status to APPROVED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.APPROVED,
        walletStatus: WalletStatus.APPROVED,
        paymentMethodStatus: PaymentMethodStatus.APPROVED,
      });

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);

      const updatedWallet: CryptoWallet = {
        ...cryptoWallet,
        status: WalletStatus.APPROVED,
      };
      const updatedPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        status: PaymentMethodStatus.APPROVED,
      };
      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
        cryptoWallets: [updatedWallet],
      });

      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(updatedConsumer, anything())).thenResolve(updatedConsumer);

      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.PASS);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
    });
    it("should update payment method status to FLAGGED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.APPROVED,
        walletStatus: WalletStatus.APPROVED,
        paymentMethodStatus: PaymentMethodStatus.FLAGGED,
      });

      const updatedWallet: CryptoWallet = {
        ...cryptoWallet,
        status: WalletStatus.APPROVED,
      };
      const updatedPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        status: PaymentMethodStatus.FLAGGED,
      };
      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
        cryptoWallets: [updatedWallet],
      });

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(updatedConsumer, anything())).thenResolve(updatedConsumer);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.PASS);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
    });
    it("should update payment method status to REJECTED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.APPROVED,
        walletStatus: WalletStatus.APPROVED,
        paymentMethodStatus: PaymentMethodStatus.REJECTED,
      });

      const updatedWallet: CryptoWallet = {
        ...cryptoWallet,
        status: WalletStatus.APPROVED,
      };
      const updatedPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        status: PaymentMethodStatus.REJECTED,
      };
      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
        cryptoWallets: [updatedWallet],
      });

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(updatedConsumer, anything())).thenResolve(updatedConsumer);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.PASS);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
    });
    it("should update wallet status to APPROVED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.APPROVED,
        walletStatus: WalletStatus.APPROVED,
        paymentMethodStatus: PaymentMethodStatus.APPROVED,
      });

      const updatedWallet: CryptoWallet = {
        ...cryptoWallet,
        status: WalletStatus.APPROVED,
      };
      const updatedPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        status: PaymentMethodStatus.APPROVED,
      };
      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
        cryptoWallets: [updatedWallet],
      });

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(updatedConsumer, anything())).thenResolve(updatedConsumer);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.PASS);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
    });
    it("should continue even if email can't be sent", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.APPROVED,
        walletStatus: WalletStatus.APPROVED,
        paymentMethodStatus: PaymentMethodStatus.APPROVED,
      });

      const updatedWallet: CryptoWallet = {
        ...cryptoWallet,
        status: WalletStatus.APPROVED,
      };
      const updatedPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        status: PaymentMethodStatus.APPROVED,
      };
      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
        cryptoWallets: [updatedWallet],
      });

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(updatedConsumer, anything())).thenResolve(updatedConsumer);
      when(emailService.sendTransactionInitiatedEmail(anything(), anything(), anything(), anything())).thenThrow(
        new Error("Unable to send email"),
      );
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.PASS);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
    });
    it("should update wallet status to FLAGGED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.APPROVED,
        walletStatus: WalletStatus.FLAGGED,
        paymentMethodStatus: PaymentMethodStatus.APPROVED,
      });

      const updatedWallet: CryptoWallet = {
        ...cryptoWallet,
        status: WalletStatus.FLAGGED,
      };
      const updatedPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        status: PaymentMethodStatus.APPROVED,
      };
      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
        cryptoWallets: [updatedWallet],
      });

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(updatedConsumer, anything())).thenResolve(updatedConsumer);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.PASS);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
    });
    it("should update wallet status to REJECTED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.APPROVED,
        walletStatus: WalletStatus.REJECTED,
        paymentMethodStatus: PaymentMethodStatus.APPROVED,
      });

      const updatedWallet: CryptoWallet = {
        ...cryptoWallet,
        status: WalletStatus.REJECTED,
      };
      const updatedPaymentMethod: PaymentMethod = {
        ...paymentMethod,
        status: PaymentMethodStatus.APPROVED,
      };
      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
        cryptoWallets: [updatedWallet],
      });

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(updatedConsumer, anything())).thenResolve(updatedConsumer);
      const status = await transactionService.validatePendingTransaction(consumer, transaction);
      expect(status).toEqual(PendingTransactionValidationStatus.PASS);
      verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
      verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
    });
  });

  describe("requestTransactionQuote", () => {
    it("throws 'BadRequestException' if amount is not valid", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: -1,
      };

      try {
        await transactionService.requestTransactionQuote(transactionQuoteQuery);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should return correct quote for 'FIAT' fixed side", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: 10,
      };

      const nobaQuote: NobaQuote = {
        quoteID: "fake-quote",
        fiatCurrency: "USD",
        cryptoCurrency: "ETH",

        processingFeeInFiat: 1,
        networkFeeInFiat: 1,
        nobaFeeInFiat: 1,

        totalFiatAmount: 13,
        totalCryptoQuantity: 0.0001,
        perUnitCryptoPrice: 100,
      };

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
            fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
            fiatAmount: Number(transactionQuoteQuery.fixedAmount),
          }),
        ),
      ).thenResolve(nobaQuote);

      const response = await transactionService.requestTransactionQuote(transactionQuoteQuery);
      assertOnRequestTransactionQuoteResponse(response, nobaQuote, transactionQuoteQuery);
    });

    it("should return correct quote for 'CRYPTO' fixed side", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        fixedAmount: 0.1,
      };

      const nobaQuote: NobaQuote = {
        quoteID: "fake-quote",
        fiatCurrency: "USD",
        cryptoCurrency: "ETH",

        processingFeeInFiat: 0.01,
        networkFeeInFiat: 0.01,
        nobaFeeInFiat: 0.01,

        totalFiatAmount: 1000,
        totalCryptoQuantity: 0.1,
        perUnitCryptoPrice: 100,
      };

      when(
        assetService.getQuoteByForSpecifiedCryptoQuantity(
          deepEqual({
            cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
            fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
            cryptoQuantity: Number(transactionQuoteQuery.fixedAmount),
          }),
        ),
      ).thenResolve(nobaQuote);

      const response = await transactionService.requestTransactionQuote(transactionQuoteQuery);
      assertOnRequestTransactionQuoteResponse(response, nobaQuote, transactionQuoteQuery);
    });
  });

  describe("callTransactionConfirmationWebhook", () => {
    afterEach(() => {
      mockAxios.reset();
    });

    it("should do nothing if partner id is null", async () => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumer.props._id,
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.PENDING,
        paymentMethodID: "fake-payment-method-id",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        destinationWalletAddress: "fake-wallet-address",
      });
      await transactionService.callTransactionConfirmWebhook(consumer, transaction);
      expect(mockAxios.post).toHaveBeenCalledTimes(0);
    });

    it("should call webhook if partner webhook is available", async () => {
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumer.props._id,
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.PENDING,
        paymentMethodID: "fake-payment-method-id",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        destinationWalletAddress: "fake-wallet-address",
        partnerID: "fake-partner-id",
      });

      const partner = Partner.createPartner({
        _id: transaction.props.partnerID,
        name: "Fake Partner",
        apiKey: "FakeApiKey",
        secretKey: "FakeSecret",
        allowPublicWallets: true, // Can wallets added for this partner be shared with others?
        webhookClientID: "fake-webhook-cid",
        webhookSecret: "fake-webhook-secret",
        webhooks: [
          {
            type: WebhookType.TRANSACTION_CONFIRM,
            url: "https://localhost:8080/fakeurl",
          },
        ],
      });

      when(partnerService.getPartner(partner.props._id)).thenResolve(partner);
      when(partnerService.getWebhook(deepEqual(partner), WebhookType.TRANSACTION_CONFIRM)).thenReturn(
        partner.props.webhooks[0],
      );

      // const responsePromise = transactionService.callTransactionConfirmWebhook(consumer, transaction);
      // expect(mockAxios.post).toHaveBeenCalled();
      // mockAxios.mockResponse({
      //   status: 200,
      //   statusText: "Successful",
      //   data: {},
      // });
      // await responsePromise;
      // expect(true).toBe(true);
    });
  });

  describe("initiateTransaction", () => {
    it("throws BadRequestException when destination wallet address is invalid", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: "fake-wallet-1234",
      };

      try {
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("throws BadRequestException when leg2 is invalid", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ABC",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      when(currencyService.getSupportedCryptocurrencies()).thenResolve([]);
      try {
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe(`Unknown cryptocurrency: ${transactionRequest.leg2}`);
      }
    });

    it("throws BadRequestException when leg1 is invalid", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "ABC",
        leg2: "ETH",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          _id: "ethereum",
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([]);
      try {
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe(`Unknown fiat currency: ${transactionRequest.leg1}`);
      }
    });

    it("should throw BadRequestException when the amount exceeds slippage", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const nobaQuote: NobaQuote = {
        quoteID: "fake-quote",
        fiatCurrency: "USD",
        cryptoCurrency: "ETH",

        processingFeeInFiat: 0.01,
        networkFeeInFiat: 0.01,
        nobaFeeInFiat: 0.01,

        totalFiatAmount: 1000,
        totalCryptoQuantity: 0.3,
        perUnitCryptoPrice: 100,
      };

      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          _id: "ethereum",
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          _id: "usd",
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
        },
      ]);

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            fiatCurrency: "USD",
            cryptoCurrency: "ETH",
            fiatAmount: transactionRequest.leg1Amount,
          }),
        ),
      ).thenResolve(nobaQuote);
      try {
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.response.messageForClient).toBe("Bid price is not within slippage allowed of 2%");
      }
    });

    it("should create transaction entry in DB with fixed FIAT side", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const nobaQuote: NobaQuote = {
        quoteID: "fake-quote",
        fiatCurrency: "USD",
        cryptoCurrency: "ETH",

        processingFeeInFiat: 0.01,
        networkFeeInFiat: 0.01,
        nobaFeeInFiat: 0.01,

        totalFiatAmount: 100,
        totalCryptoQuantity: 0.1,
        perUnitCryptoPrice: 100,
      };

      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          _id: "ethereum",
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          _id: "usd",
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
        },
      ]);

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            fiatCurrency: "USD",
            cryptoCurrency: "ETH",
            fiatAmount: transactionRequest.leg1Amount,
          }),
        ),
      ).thenResolve(nobaQuote);

      const responseTransaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumerId,
        sessionKey: sessionKey,
        paymentMethodID: transactionRequest.paymentToken,
        leg1Amount: transactionRequest.leg1Amount,
        leg2Amount: transactionRequest.leg2Amount,
        leg1: transactionRequest.leg1,
        leg2: transactionRequest.leg2,
        transactionStatus: TransactionStatus.PENDING,
        partnerID: partnerId,
        destinationWalletAddress: transactionRequest.destinationWalletAddress,
      });

      const responseTransactionDTO = transactionMapper.toDTO(responseTransaction);
      delete responseTransactionDTO._id; // Delete id as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionTimestamp;

      when(transactionRepo.createTransaction(anything())).thenResolve(responseTransaction);

      const response = await transactionService.initiateTransaction(
        consumerId,
        partnerId,
        sessionKey,
        transactionRequest,
      );
      delete response._id;
      delete response.transactionTimestamp;
      expect(response).toStrictEqual(responseTransactionDTO);
    });

    it("should create transaction entry in DB with fixed CRYPTO side", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.CRYPTO,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const nobaQuote: NobaQuote = {
        quoteID: "fake-quote",
        fiatCurrency: "USD",
        cryptoCurrency: "ETH",

        processingFeeInFiat: 0.01,
        networkFeeInFiat: 0.01,
        nobaFeeInFiat: 0.01,

        totalFiatAmount: 100,
        totalCryptoQuantity: 0.1,
        perUnitCryptoPrice: 100,
      };

      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          _id: "ethereum",
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          _id: "usd",
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
        },
      ]);

      when(
        assetService.getQuoteByForSpecifiedCryptoQuantity(
          deepEqual({
            fiatCurrency: "USD",
            cryptoCurrency: "ETH",
            cryptoQuantity: 0.1,
          }),
        ),
      ).thenResolve(nobaQuote);

      const responseTransaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumerId,
        sessionKey: sessionKey,
        paymentMethodID: transactionRequest.paymentToken,
        leg1Amount: transactionRequest.leg1Amount,
        leg2Amount: transactionRequest.leg2Amount,
        leg1: transactionRequest.leg1,
        leg2: transactionRequest.leg2,
        transactionStatus: TransactionStatus.PENDING,
        partnerID: partnerId,
        destinationWalletAddress: transactionRequest.destinationWalletAddress,
      });

      const responseTransactionDTO = transactionMapper.toDTO(responseTransaction);
      delete responseTransactionDTO._id; // Delete id as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionTimestamp; // Delete timestamp as it makes tests flaky

      when(transactionRepo.createTransaction(anything())).thenResolve(responseTransaction);

      const response = await transactionService.initiateTransaction(
        consumerId,
        partnerId,
        sessionKey,
        transactionRequest,
      );
      delete response._id;
      delete response.transactionTimestamp;
      expect(response).toStrictEqual(responseTransactionDTO);
    });
  });

  describe("getTransactionStatus", () => {
    it("should get transaction with given id from database", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        sessionKey: "fake-session-key",
        paymentMethodID: "fake-payment-token",
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        partnerID: "fake-partner",
        destinationWalletAddress: FAKE_VALID_WALLET,
        transactionTimestamp: new Date(),
      });

      const transactionDTO = transactionMapper.toDTO(transaction);

      when(transactionRepo.getTransaction(transaction.props._id)).thenResolve(transaction);

      const response = await transactionService.getTransactionStatus(transaction.props._id);
      expect(response).toStrictEqual(transactionDTO);
    });
  });

  describe("getUserTransactions", () => {
    it("should return all user transactions from database", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        sessionKey: "fake-session-key",
        paymentMethodID: "fake-payment-token",
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        partnerID: "fake-partner",
        destinationWalletAddress: FAKE_VALID_WALLET,
        transactionTimestamp: new Date(),
      });

      const transactionDTO = transactionMapper.toDTO(transaction);

      when(transactionRepo.getUserTransactions(transaction.props.userId, transaction.props.partnerID)).thenResolve([
        transaction,
      ]);

      const response = await transactionService.getUserTransactions(
        transaction.props.userId,
        transaction.props.partnerID,
      );
      expect(response.length).toBe(1);
      expect(response).toStrictEqual([transactionDTO]);
    });
  });

  describe("getAllTransactions", () => {
    it("should return all transactions from database", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        sessionKey: "fake-session-key",
        paymentMethodID: "fake-payment-token",
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        partnerID: "fake-partner",
        destinationWalletAddress: FAKE_VALID_WALLET,
        transactionTimestamp: new Date(),
      });
      when(transactionRepo.getAll()).thenResolve([transaction]);

      const response = await transactionService.getAllTransactions();
      expect(response.length).toBe(1);
      expect(response).toStrictEqual([transactionMapper.toDTO(transaction)]);
    });
  });

  describe("getTransactionsInInterval", () => {
    it("should return all user transactions from database for an interval", async () => {
      const fromDate = new Date("2020-01-01");
      const toDate = new Date("2020-03-03");

      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        sessionKey: "fake-session-key",
        paymentMethodID: "fake-payment-token",
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        partnerID: "fake-partner",
        destinationWalletAddress: FAKE_VALID_WALLET,
        transactionTimestamp: fromDate,
      });

      when(
        transactionRepo.getUserTransactionInAnInterval(
          transaction.props.userId,
          transaction.props.partnerID,
          fromDate,
          toDate,
        ),
      ).thenResolve([transaction]);

      const response = await transactionService.getTransactionsInInterval(
        transaction.props.userId,
        transaction.props.partnerID,
        fromDate,
        toDate,
      );
      expect(response.length).toBe(1);
      expect(response).toStrictEqual([transactionMapper.toDTO(transaction)]);
    });
  });
});

function assertOnRequestTransactionQuoteResponse(
  response: TransactionQuoteDTO,
  nobaQuote: NobaQuote,
  transactionQuoteQuery: TransactionQuoteQueryDTO,
) {
  expect(response.quoteID).toBe(nobaQuote.quoteID);
  expect(response.fiatCurrencyCode).toBe(nobaQuote.fiatCurrency);
  expect(response.cryptoCurrencyCode).toBe(nobaQuote.cryptoCurrency);
  expect(response.fixedSide).toBe(transactionQuoteQuery.fixedSide);
  expect(response.fixedAmount).toBe(transactionQuoteQuery.fixedAmount);
  expect(response.quotedAmount).toBe(nobaQuote.totalCryptoQuantity);
  expect(response.processingFee).toBe(nobaQuote.processingFeeInFiat);
  expect(response.networkFee).toBe(nobaQuote.networkFeeInFiat);
  expect(response.nobaFee).toBe(nobaQuote.nobaFeeInFiat);
  expect(response.exchangeRate).toBe(nobaQuote.perUnitCryptoPrice);
}
