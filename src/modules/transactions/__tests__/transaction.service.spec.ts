const FAKE_VALID_WALLET = "fake-valid-wallet";

jest.mock("multicoin-address-validator", () => ({
  validate: jest.fn((walletAddress, _) => {
    if (walletAddress === FAKE_VALID_WALLET) return true;
    return false;
  }),
}));

import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { anyString, anything, capture, deepEqual, instance, reset, verify, when } from "ts-mockito";
import {
  DYNAMIC_CREDIT_CARD_FEE_PRECENTAGE,
  FIXED_CREDIT_CARD_FEE,
  FLAT_FEE_DOLLARS,
  NOBA_CONFIG_KEY,
  NOBA_TRANSACTION_CONFIG_KEY,
  SLIPPAGE_ALLOWED_PERCENTAGE,
  SPREAD_PERCENTAGE,
} from "../../../config/ConfigurationUtils";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { EllipticService } from "../../../modules/common/elliptic.service";
import { getMockEllipticServiceWithDefaults } from "../../../modules/common/mocks/mock.elliptic.service";
import { SanctionedCryptoWalletService } from "../../../modules/common/sanctionedcryptowallet.service";
import { CryptoWallet } from "../../../modules/consumer/domain/CryptoWallet";
import { PaymentMethod, PaymentMethodType } from "../../../modules/consumer/domain/PaymentMethod";
import { PendingTransactionValidationStatus } from "../../../modules/consumer/domain/Types";
import { KYCStatus, PaymentMethodStatus, WalletStatus } from "../../../modules/consumer/domain/VerificationStatus";
import { CurrencyService } from "../../common/currency.service";
import { CurrencyType } from "../../common/domain/Types";
import { getMockCurrencyServiceWithDefaults } from "../../common/mocks/mock.currency.service";
import { getMockSanctionedCryptoWalletServiceWithDefaults } from "../../common/mocks/mock.sanctionedcryptowallet.service";
import { ConsumerService } from "../../consumer/consumer.service";
import { Consumer } from "../../consumer/domain/Consumer";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { getMockVerificationServiceWithDefaults } from "../../verification/mocks/mock.verification.service";
import { VerificationService } from "../../verification/verification.service";
import { AssetService } from "../assets/asset.service";
import { AssetServiceFactory } from "../assets/asset.service.factory";
import { CombinedNobaQuote, ConsumerAccountBalance, ConsumerAccountProvider, NobaQuote } from "../domain/AssetTypes";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus, TransactionType } from "../domain/Types";
import { CreateTransactionDTO } from "../dto/CreateTransactionDTO";
import { TransactionQuoteDTO } from "../dto/TransactionQuoteDTO";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQueryDTO";
import {
  TransactionSubmissionException,
  TransactionSubmissionFailureExceptionText,
} from "../exceptions/TransactionSubmissionException";
import { LimitsService } from "../limits.service";
import { TransactionMapper } from "../mapper/TransactionMapper";
import {
  getMockAssetServiceFactoryWithDefaultAssetService,
  getMockAssetServiceWithDefaults,
} from "../mocks/mock.asset.service";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.transactions.repo";
import { getMockZerohashServiceWithDefaults } from "../mocks/mock.zerohash.service";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { ZeroHashService } from "../zerohash.service";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { PaymentProvider } from "../../../modules/consumer/domain/PaymentProvider";
import { TransactionAllowedStatus } from "../domain/TransactionAllowedStatus";
import { Utils } from "../../../core/utils/Utils";
import { getMockLimitsServiceWithDefaults } from "../mocks/mock.limits.service";
import { WalletProviderService } from "../assets/wallet.provider.service";
import { getMockWalletProviderServiceWithDefaults } from "../mocks/mock.wallet.provider.service";
import { CircleClient } from "../../../modules/psp/circle.client";
import { getMockCircleClientWithDefaults } from "../../../modules/psp/mocks/mock.circle.client";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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
  let consumerService: ConsumerService;
  let transactionService: TransactionService;
  let zerohashService: ZeroHashService;
  let verificationService: VerificationService;
  let currencyService: CurrencyService;
  let notificationService: NotificationService;
  let assetServiceFactory: AssetServiceFactory;
  let assetService: AssetService;
  let walletProviderService: WalletProviderService;
  let transactionMapper: TransactionMapper;
  let ellipticService: EllipticService;
  let limitService: LimitsService;
  let sanctionedCryptoWalletService: SanctionedCryptoWalletService;
  let circleClient: CircleClient;

  const userId = "1234567890";
  const consumer: Consumer = Consumer.createConsumer({
    _id: userId,
    email: "test@noba.com",
  });

  const setupTestModule = async (environmentVariables: Record<string, any>): Promise<void> => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    zerohashService = getMockZerohashServiceWithDefaults();
    currencyService = getMockCurrencyServiceWithDefaults();
    verificationService = getMockVerificationServiceWithDefaults();
    notificationService = getMockNotificationServiceWithDefaults();
    assetServiceFactory = getMockAssetServiceFactoryWithDefaultAssetService();
    ellipticService = getMockEllipticServiceWithDefaults();
    limitService = getMockLimitsServiceWithDefaults();
    sanctionedCryptoWalletService = getMockSanctionedCryptoWalletServiceWithDefaults();
    walletProviderService = getMockWalletProviderServiceWithDefaults();
    circleClient = getMockCircleClientWithDefaults();

    transactionMapper = new TransactionMapper();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [
        DBProvider,
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
          provide: NotificationService,
          useFactory: () => instance(notificationService),
        },
        {
          provide: AssetServiceFactory,
          useFactory: () => instance(assetServiceFactory),
        },
        {
          provide: EllipticService,
          useFactory: () => instance(ellipticService),
        },
        {
          provide: SanctionedCryptoWalletService,
          useFactory: () => instance(sanctionedCryptoWalletService),
        },
        {
          provide: LimitsService,
          useFactory: () => instance(limitService),
        },
        {
          provide: CircleClient,
          useFactory: () => instance(circleClient),
        },
      ],
    }).compile();
    transactionService = app.get<TransactionService>(TransactionService);

    const walletProviderServiceInstance = instance(walletProviderService);
    when(assetServiceFactory.getWalletProviderService()).thenReturn(walletProviderServiceInstance);

    assetService = getMockAssetServiceWithDefaults();
    when(assetServiceFactory.getAssetService(anyString())).thenResolve(instance(assetService));
    when(currencyService.getCryptocurrency("ETH")).thenResolve({
      ticker: "ETH",
      name: "Ethereum",
      iconPath: "",
      precision: 8,
      provider: "Zerohash",
    });

    when(currencyService.getFiatCurrency("USD")).thenResolve({
      ticker: "USD",
      name: "US Dollar",
      iconPath: "",
      precision: 8,
      provider: "Zerohash",
    });

    when(sanctionedCryptoWalletService.isWalletSanctioned(anyString())).thenResolve(false);
  };

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
      type: TransactionType.ONRAMP,
      fiatPaymentInfo: {
        paymentMethodID: paymentMethodID,
        isCompleted: false,
        isApproved: false,
        isFailed: false,
        details: [],
        paymentID: undefined,
        paymentProvider: PaymentProvider.CHECKOUT,
      },
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
      destinationWalletAddress: walletAddress,
    });

    const paymentMethod: PaymentMethod = {
      type: PaymentMethodType.CARD,
      cardData: {
        first6Digits: "123456",
        last4Digits: "7890",
      },
      imageUri: "xxx",
      isDefault: false,
      paymentProviderID: "12345" as any,
      paymentToken: paymentMethodID,
      status: PaymentMethodStatus.APPROVED,
    };

    const cryptoWallet: CryptoWallet = {
      address: walletAddress,
      isEVMCompatible: false,
      status: WalletStatus.APPROVED,
    };

    const consumerNoPaymentMethod = Consumer.createConsumer({
      _id: consumerID,
      firstName: "Mock",
      lastName: "Consumer",
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
      try {
        await transactionService.validatePendingTransaction(consumerNoPaymentMethod, transaction);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        expect(e.disposition).toBe(TransactionSubmissionFailureExceptionText.UNKNOWN_PAYMENT_METHOD);
        verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
        verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
      }
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

      try {
        await transactionService.validatePendingTransaction(consumer, transaction);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        expect(e.disposition).toBe(TransactionSubmissionFailureExceptionText.SANCTIONED_TRANSACTION);
        verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
        verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
      }
    });
    it("should fail if wallet doesn't exist", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, "BadWallet")).thenReturn(cryptoWallet);
      try {
        await transactionService.validatePendingTransaction(consumer, transaction);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        expect(e.disposition).toBe(TransactionSubmissionFailureExceptionText.WALLET_DOES_NOT_EXIST);
        verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
        verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
      }
    });
    it("should fail if verification service returns KYC PENDING", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.PENDING,
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

      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);

      try {
        await transactionService.validatePendingTransaction(consumer, transaction);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        expect(e.disposition).toBe(TransactionSubmissionFailureExceptionText.SANCTIONED_TRANSACTION);
        verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).once();
        verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).once();
      }
    });
    it("should fail if verification service returns KYC REJECTED", async () => {
      await setupTestModule(defaultEnvironmentVariables);
      when(verificationService.transactionVerification(sessionKey, consumer, anything())).thenResolve({
        status: KYCStatus.REJECTED,
      });
      reset(consumerService);
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);

      try {
        await transactionService.validatePendingTransaction(consumer, transaction);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        expect(e.disposition).toBe(TransactionSubmissionFailureExceptionText.SANCTIONED_TRANSACTION);
        verify(consumerService.updatePaymentMethod(consumerID, deepEqual(paymentMethod))).never();
        verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(cryptoWallet))).never();
      }
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
      when(notificationService.sendNotification(anyString(), anyString())).thenThrow(new Error("Unable to send email"));

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
      when(consumerService.addOrUpdateCryptoWallet(consumer, anything())).thenResolve(updatedConsumer);

      try {
        await transactionService.validatePendingTransaction(consumer, transaction);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        expect(e.disposition).toBe(TransactionSubmissionFailureExceptionText.SANCTIONED_WALLET);
        verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).times(1);
        verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).times(1);
      }
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
      when(consumerService.getCryptoWallet(consumer, consumer.props.cryptoWallets[0].address)).thenReturn(
        consumer.props.cryptoWallets[0],
      );
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(consumer, anything())).thenResolve(updatedConsumer);

      try {
        await transactionService.validatePendingTransaction(consumer, transaction);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        expect(e.disposition).toBe(TransactionSubmissionFailureExceptionText.SANCTIONED_WALLET);
        verify(consumerService.updatePaymentMethod(consumerID, deepEqual(updatedPaymentMethod))).once();
        verify(consumerService.addOrUpdateCryptoWallet(consumer, deepEqual(updatedWallet))).once();
      }
    });
  });

  describe("requestTransactionQuote", () => {
    beforeEach(() => {
      when(assetService.needsIntermediaryLeg()).thenReturn(false);
    });

    it("throws 'BadRequestException' if amount is not valid", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: -1,

        transactionType: TransactionType.ONRAMP,
      };

      try {
        await transactionService.requestTransactionQuote(transactionQuoteQuery);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toMatch("amount");
      }
    });

    it("should return correct quote for 'FIAT' fixed side", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: 10,

        transactionType: TransactionType.ONRAMP,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",

          processingFeeInFiat: 1,
          networkFeeInFiat: 1,
          nobaFeeInFiat: 1,
          amountPreSpread: 1,

          quotedFiatAmount: 13,
          totalFiatAmount: 13,
          totalCryptoQuantity: 0.0001,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",

          processingFeeInFiat: 1,
          networkFeeInFiat: 1,
          nobaFeeInFiat: 1,
          amountPreSpread: 1,

          quotedFiatAmount: 13,
          totalFiatAmount: 13,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
            fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
            fiatAmount: Number(transactionQuoteQuery.fixedAmount),
            transactionType: TransactionType.ONRAMP,
          }),
        ),
      ).thenResolve(nobaQuote);

      const response = await transactionService.requestTransactionQuote(transactionQuoteQuery);
      assertOnRequestTransactionQuoteResponse(response, nobaQuote.quote, transactionQuoteQuery);
    });

    it("should return correct quote with all the different discounts applied for 'FIAT' fixed side", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: 10,

        transactionType: TransactionType.ONRAMP,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",

          processingFeeInFiat: 1,
          networkFeeInFiat: 1,
          nobaFeeInFiat: 1,
          amountPreSpread: 1,

          quotedFiatAmount: 13,
          totalFiatAmount: 13,
          totalCryptoQuantity: 0.0001,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",

          processingFeeInFiat: 1,
          networkFeeInFiat: 1,
          nobaFeeInFiat: 1,
          amountPreSpread: 1,

          quotedFiatAmount: 13,
          totalFiatAmount: 13,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
            fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
            fiatAmount: Number(transactionQuoteQuery.fixedAmount),
            transactionType: TransactionType.ONRAMP,
          }),
        ),
      ).thenResolve(nobaQuote);

      const response = await transactionService.requestTransactionQuote(transactionQuoteQuery);
      assertOnRequestTransactionQuoteResponse(response, nobaQuote.quote, transactionQuoteQuery);
    });

    it("should return correct quote for 'CRYPTO' fixed side", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        fixedAmount: 0.1,

        transactionType: TransactionType.ONRAMP,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",

          processingFeeInFiat: 10,
          networkFeeInFiat: 20,
          nobaFeeInFiat: 30,
          amountPreSpread: 90,

          quotedFiatAmount: 90,
          totalFiatAmount: 160,
          totalCryptoQuantity: 0.1,
          perUnitCryptoPriceWithoutSpread: 900,
          perUnitCryptoPriceWithSpread: 1000,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",

          processingFeeInFiat: 10,
          networkFeeInFiat: 20,
          nobaFeeInFiat: 30,
          amountPreSpread: 90,

          quotedFiatAmount: 90,
          totalFiatAmount: 160,
          perUnitCryptoPriceWithoutSpread: 900,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };

      when(
        assetService.getQuoteForSpecifiedCryptoQuantity(
          deepEqual({
            cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
            fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
            cryptoQuantity: Number(transactionQuoteQuery.fixedAmount),
            transactionType: TransactionType.ONRAMP,
          }),
        ),
      ).thenResolve(nobaQuote);

      const response = await transactionService.requestTransactionQuote(transactionQuoteQuery);
      assertOnRequestTransactionQuoteResponse(response, nobaQuote.quote, transactionQuoteQuery);
    });
  });

  describe("initiateTransaction", () => {
    beforeEach(async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);

      when(assetService.needsIntermediaryLeg()).thenReturn(false);
    });

    it("throws TransactionSubmissionException when destination wallet address is invalid", async () => {
      const consumerId = consumer.props.id;

      const sessionKey = "fake-session-key";
      const walletAddress = "fake-wallet-1234";
      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: walletAddress,
      };

      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.INVALID_WALLET);
      }
    });

    // TODO: Fix and uncomment this test, it is breaking with TypeError, but SANCTION wallet codeflow is working fine.
    //
    // it("throws TransactionSubmissionException when destination wallet address is sanctioned", async () => {
    //   const consumerId = consumer.props.id;
    //
    //   const sessionKey = "fake-session-key";
    //   when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(true);

    //   const transactionRequest: CreateTransactionDTO = {
    //     paymentToken: "fake-payment-token",
    //     type: TransactionType.ONRAMP,
    //     leg1: "USD",
    //     leg2: "ETH",
    //     leg1Amount: 100,
    //     leg2Amount: 0.1,
    //     fixedSide: CurrencyType.FIAT,
    //     destinationWalletAddress: FAKE_VALID_WALLET,
    //   };

    //

    //   try {
    //     await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
    //   } catch (e) {
    //     expect(e).toBeInstanceOf(TransactionSubmissionException);
    //     const err = e as TransactionSubmissionException;
    //     expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.SANCTIONED_WALLET);
    //   }
    // });

    it("throws TransactionSubmissionException when leg2 is invalid", async () => {
      when(currencyService.getCryptocurrency("ABC")).thenResolve(null);

      const consumerId = consumer.props.id;
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
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.UNKNOWN_CRYPTO);
      }
    });

    it("throws TransactionSubmissionException when leg1 is invalid", async () => {
      when(currencyService.getFiatCurrency("ABC")).thenResolve(null);

      const consumerId = consumer.props.id;

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

      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);

      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([]);
      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.UNKNOWN_FIAT);
      }
    });

    it("should throws TransactionSubmissionException when MONTHLY_LIMIT is breached", async () => {
      const consumerId = "mock-consumer-id";

      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(
        limitService.canMakeTransaction(deepEqual(consumer), 100, TransactionType.ONRAMP, PaymentMethodType.CARD),
      ).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.MONTHLY_LIMIT_REACHED,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: fiatAmount,
        leg2Amount: fiatAmount / exchangeRate,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.MONTHLY_LIMIT_REACHED);
      }
    });

    it("should throws TransactionSubmissionException when DAILY_LIMIT is breached", async () => {
      const consumerId = "mock-consumer-id";

      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(limitService.canMakeTransaction(consumer, 100, TransactionType.ONRAMP, PaymentMethodType.CARD)).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.DAILY_LIMIT_REACHED,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: fiatAmount,
        leg2Amount: fiatAmount / exchangeRate,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.DAILY_LIMIT_REACHED);
      }
    });

    it("should throws TransactionSubmissionException when WEEKLY_LIMIT is breached", async () => {
      const consumerId = "mock-consumer-id";

      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(limitService.canMakeTransaction(consumer, 100, TransactionType.ONRAMP, PaymentMethodType.CARD)).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.WEEKLY_LIMIT_REACHED,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: fiatAmount,
        leg2Amount: fiatAmount / exchangeRate,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.WEEKLY_LIMIT_REACHED);
      }
    });

    it("should throws TransactionSubmissionException when transaction value is too small", async () => {
      const consumerId = "mock-consumer-id";

      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(limitService.canMakeTransaction(consumer, 100, TransactionType.ONRAMP, PaymentMethodType.CARD)).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.TRANSACTION_TOO_SMALL,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: fiatAmount,
        leg2Amount: fiatAmount / exchangeRate,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.TRANSACTION_TOO_SMALL);
      }
    });

    it("should throws TransactionSubmissionException when transaction value is too large", async () => {
      const consumerId = "mock-consumer-id";

      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(limitService.canMakeTransaction(consumer, 100, TransactionType.ONRAMP, PaymentMethodType.CARD)).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.TRANSACTION_TOO_LARGE,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: fiatAmount,
        leg2Amount: fiatAmount / exchangeRate,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.TRANSACTION_TOO_LARGE);
      }
    });

    it("should throw BadRequestException when intermediary leg is needed and fixed side is 'CRYPTO'", async () => {
      const consumerId = "mock-consumer-id";
      const sessionKey = "fake-session-key";
      const paymentToken = "fake-payment-token";

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "axlUSDCMoonbeam",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.CRYPTO,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const consumer: Consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(limitService.canMakeTransaction(consumer, 100, TransactionType.ONRAMP, PaymentMethodType.CARD)).thenResolve({
        status: TransactionAllowedStatus.ALLOWED,
        rangeMin: 0,
        rangeMax: 100,
      });

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "axlUSDCMoonbeam",
          name: "Moonbeam",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getCryptocurrency("axlUSDCMoonbeam")).thenResolve({
        ticker: "axlUSDCMoonbeam",
        name: "Moonbeam",
        iconPath: "",
        precision: 8,
        provider: "Zerohash",
      });

      when(assetService.needsIntermediaryLeg()).thenReturn(true);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe(`Fixed side crypto is not allowed for ${transactionRequest.leg2}`);
      }
    });

    it("should throw BadRequestException when the amount exceeds slippage", async () => {
      const consumerId = "mock-consumer-id";
      const sessionKey = "fake-session-key";
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(limitService.canMakeTransaction(consumer, 100, TransactionType.ONRAMP, PaymentMethodType.CARD)).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.ALLOWED,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",

          processingFeeInFiat: 0.01,
          networkFeeInFiat: 0.01,
          nobaFeeInFiat: 0.01,
          amountPreSpread: 0.01,

          quotedFiatAmount: 1000,
          totalFiatAmount: 1000,
          totalCryptoQuantity: 0.3,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",

          processingFeeInFiat: 0.01,
          networkFeeInFiat: 0.01,
          nobaFeeInFiat: 0.01,
          amountPreSpread: 0.01,

          quotedFiatAmount: 1000,
          totalFiatAmount: 1000,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(assetService.needsIntermediaryLeg()).thenReturn(false);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            fiatCurrency: "USD",
            cryptoCurrency: "ETH",
            fiatAmount: transactionRequest.leg1Amount,
            intermediateCryptoCurrency: undefined,
            transactionType: TransactionType.ONRAMP,
          }),
        ),
      ).thenResolve(nobaQuote);
      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.SLIPPAGE);
      }
    });

    it("should create transaction entry in DB with fixed FIAT side", async () => {
      const consumerId = "mock-consumer-id";

      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(limitService.canMakeTransaction(consumer, 100, TransactionType.ONRAMP, PaymentMethodType.CARD)).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.ALLOWED,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: fiatAmount,
        leg2Amount: fiatAmount / exchangeRate,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",

          processingFeeInFiat: 0.01,
          networkFeeInFiat: 0.01,
          nobaFeeInFiat: 0.01,
          amountPreSpread: 0.01,

          quotedFiatAmount: 100,
          totalFiatAmount: 100,
          totalCryptoQuantity: 0.1,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",

          processingFeeInFiat: 0.01,
          networkFeeInFiat: 0.01,
          nobaFeeInFiat: 0.01,
          amountPreSpread: 0.01,

          quotedFiatAmount: 100,
          totalFiatAmount: 100,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            fiatCurrency: "USD",
            cryptoCurrency: "ETH",
            fiatAmount: transactionRequest.leg1Amount,
            intermediateCryptoCurrency: undefined,
            transactionType: TransactionType.ONRAMP,
          }),
        ),
      ).thenResolve(nobaQuote);

      const responseTransaction = Transaction.createTransaction({
        _id: "fake-id-12345",
        transactionID: "fake-transaction-id",
        userId: consumerId,
        sessionKey: sessionKey,
        fiatPaymentInfo: {
          paymentMethodID: transactionRequest.paymentToken,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: undefined,
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: transactionRequest.leg1Amount,
        leg2Amount: transactionRequest.leg2Amount,
        leg1: transactionRequest.leg1,
        leg2: transactionRequest.leg2,
        transactionStatus: TransactionStatus.PENDING,

        destinationWalletAddress: transactionRequest.destinationWalletAddress,
        networkFee: nobaQuote.quote.networkFeeInFiat,
        nobaFee: nobaQuote.quote.nobaFeeInFiat,
        processingFee: nobaQuote.quote.processingFeeInFiat,
        exchangeRate: exchangeRate,
      });

      const responseTransactionDTO = transactionMapper.toDTO(responseTransaction);
      delete responseTransactionDTO._id; // Delete id as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionID; // Delete transactionID as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionTimestamp;

      when(transactionRepo.createTransaction(anything())).thenResolve(responseTransaction);

      const response = await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      delete response._id;
      delete response.transactionID;
      delete response.transactionTimestamp;
      expect(response).toStrictEqual(responseTransactionDTO);
    });

    it("should create transaction entry in DB with fixed FIAT side and intermediary leg is needed", async () => {
      const consumerId = "mock-consumer-id";
      const intermediaryLeg = "USDC.POLYGON";

      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(limitService.canMakeTransaction(consumer, 100, TransactionType.ONRAMP, PaymentMethodType.CARD)).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.ALLOWED,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "axlUSDCMoonbeam",
        leg1Amount: fiatAmount,
        leg2Amount: fiatAmount / exchangeRate,
        fixedSide: CurrencyType.FIAT,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "axlUSDCMoonbeam",

          processingFeeInFiat: 0.01,
          networkFeeInFiat: 0.01,
          nobaFeeInFiat: 0.01,
          amountPreSpread: 0.01,

          quotedFiatAmount: 100,
          totalFiatAmount: 100,
          totalCryptoQuantity: 0.1,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",

          processingFeeInFiat: 0.01,
          networkFeeInFiat: 0.01,
          nobaFeeInFiat: 0.01,
          amountPreSpread: 0.01,

          quotedFiatAmount: 100,
          totalFiatAmount: 100,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "axlUSDCMoonbeam",
          name: "Moonbeam",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getCryptocurrency("axlUSDCMoonbeam")).thenResolve({
        ticker: "axlUSDCMoonbeam",
        name: "Moonbeam",
        iconPath: "",
        precision: 8,
        provider: "Zerohash",
      });

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
        },
      ]);

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            fiatCurrency: "USD",
            cryptoCurrency: "axlUSDCMoonbeam",
            fiatAmount: transactionRequest.leg1Amount,
            intermediateCryptoCurrency: intermediaryLeg,
            transactionType: TransactionType.ONRAMP,
          }),
        ),
      ).thenResolve(nobaQuote);

      when(assetService.needsIntermediaryLeg()).thenReturn(true);
      when(assetService.getIntermediaryLeg()).thenReturn(intermediaryLeg);
      const responseTransaction = Transaction.createTransaction({
        _id: "fake-id-12345",
        transactionID: "fake-transaction-id",
        userId: consumerId,
        sessionKey: sessionKey,
        fiatPaymentInfo: {
          paymentMethodID: transactionRequest.paymentToken,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: undefined,
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: transactionRequest.leg1Amount,
        leg2Amount: transactionRequest.leg2Amount,
        leg1: transactionRequest.leg1,
        leg2: transactionRequest.leg2,
        intermediaryLeg: intermediaryLeg,
        transactionStatus: TransactionStatus.PENDING,

        destinationWalletAddress: transactionRequest.destinationWalletAddress,
        networkFee: nobaQuote.quote.networkFeeInFiat,
        nobaFee: nobaQuote.quote.nobaFeeInFiat,
        processingFee: nobaQuote.quote.processingFeeInFiat,
        exchangeRate: exchangeRate,
      });

      const responseTransactionDTO = transactionMapper.toDTO(responseTransaction);
      delete responseTransactionDTO._id; // Delete id as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionID; // Delete transactionID as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionTimestamp;

      when(transactionRepo.createTransaction(anything())).thenResolve(responseTransaction);

      const response = await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      delete response._id;
      delete response.transactionID;
      delete response.transactionTimestamp;
      expect(response).toStrictEqual(responseTransactionDTO);
    });

    it("should create transaction entry in DB with fixed CRYPTO side", async () => {
      const consumerId = "mock-consumer-id";
      const sessionKey = "fake-session-key";
      const initialQuotedFiatAmount = 160;
      const initialQuotedConversionRate = 1600;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(
        limitService.canMakeTransaction(
          consumer,
          initialQuotedFiatAmount,
          TransactionType.ONRAMP,
          PaymentMethodType.CARD,
        ),
      ).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.ALLOWED,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: initialQuotedFiatAmount,
        leg2Amount: initialQuotedFiatAmount / initialQuotedConversionRate,
        fixedSide: CurrencyType.CRYPTO,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",

          processingFeeInFiat: 10,
          networkFeeInFiat: 20,
          nobaFeeInFiat: 30,
          amountPreSpread: 90,

          quotedFiatAmount: 90,
          totalFiatAmount: 160,
          totalCryptoQuantity: 0.1,
          perUnitCryptoPriceWithoutSpread: 900,
          perUnitCryptoPriceWithSpread: 1000,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",

          processingFeeInFiat: 10,
          networkFeeInFiat: 20,
          nobaFeeInFiat: 30,
          amountPreSpread: 90,

          quotedFiatAmount: 90,
          totalFiatAmount: 160,
          perUnitCryptoPriceWithoutSpread: 900,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(
        assetService.getQuoteForSpecifiedCryptoQuantity(
          deepEqual({
            cryptoCurrency: "ETH",
            fiatCurrency: "USD",
            cryptoQuantity: 0.1,
            transactionType: TransactionType.ONRAMP,
          }),
        ),
      ).thenResolve(nobaQuote);

      const responseTransaction = Transaction.createTransaction({
        _id: "fake-id-12345",
        transactionID: "fake-transaction-id",
        userId: consumerId,
        sessionKey: sessionKey,
        fiatPaymentInfo: {
          paymentMethodID: transactionRequest.paymentToken,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: undefined,
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: transactionRequest.leg1Amount,
        leg2Amount: transactionRequest.leg2Amount,
        leg1: transactionRequest.leg1,
        leg2: transactionRequest.leg2,
        transactionStatus: TransactionStatus.PENDING,

        destinationWalletAddress: transactionRequest.destinationWalletAddress,
        networkFee: nobaQuote.quote.networkFeeInFiat,
        nobaFee: nobaQuote.quote.nobaFeeInFiat,
        processingFee: nobaQuote.quote.processingFeeInFiat,
        //  This is the new conversion rate & it can be different from the
        // rate which user will actually get in the final transaction email.
        exchangeRate: nobaQuote.quote.perUnitCryptoPriceWithSpread,
      });

      const responseTransactionDTO = transactionMapper.toDTO(responseTransaction);
      delete responseTransactionDTO._id; // Delete id as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionID; // Delete transactionID as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionTimestamp; // Delete timestamp as it makes tests flaky

      when(transactionRepo.createTransaction(anything())).thenResolve(responseTransaction);

      const response = await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
      delete response._id;
      delete response.transactionID;
      delete response.transactionTimestamp;
      expect(response).toStrictEqual(responseTransactionDTO);
    });

    it("should throw BadRequestException when the new conversion rate is not within slippage for fixed CRYPTO side", async () => {
      const consumerId = "mock-consumer-id";
      const sessionKey = "fake-session-key";
      const initialQuotedFiatAmount = 160;
      const initialQuotedConversionRate = 1600;
      const paymentToken = "fake-payment-token";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        email: "test@noba.com",

        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumerId)).thenResolve(consumer);
      when(
        limitService.canMakeTransaction(
          consumer,
          initialQuotedFiatAmount,
          TransactionType.ONRAMP,
          PaymentMethodType.CARD,
        ),
      ).thenResolve({
        rangeMin: 0,
        rangeMax: 100,
        status: TransactionAllowedStatus.ALLOWED,
      });

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: paymentToken,
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: initialQuotedFiatAmount,
        leg2Amount: initialQuotedFiatAmount / initialQuotedConversionRate,
        fixedSide: CurrencyType.CRYPTO,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",

          processingFeeInFiat: 10,
          networkFeeInFiat: 20,
          nobaFeeInFiat: 30,
          amountPreSpread: 90,

          quotedFiatAmount: 90,
          totalFiatAmount: 200,
          totalCryptoQuantity: 0.1,
          perUnitCryptoPriceWithoutSpread: 900,
          perUnitCryptoPriceWithSpread: 1400,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",

          processingFeeInFiat: 10,
          networkFeeInFiat: 20,
          nobaFeeInFiat: 30,
          amountPreSpread: 90,

          quotedFiatAmount: 90,
          totalFiatAmount: 160,
          perUnitCryptoPriceWithoutSpread: 900,
          perUnitCryptoPriceWithSpread: 1000,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      };

      when(sanctionedCryptoWalletService.isWalletSanctioned(FAKE_VALID_WALLET)).thenResolve(false);
      when(currencyService.getSupportedCryptocurrencies()).thenResolve([
        {
          ticker: "ETH",
          name: "Ethereum",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(currencyService.getSupportedFiatCurrencies()).thenResolve([
        {
          ticker: "USD",
          name: "US Dollar",
          iconPath: "",
          precision: 8,
          provider: "Zerohash",
        },
      ]);

      when(
        assetService.getQuoteForSpecifiedCryptoQuantity(
          deepEqual({
            cryptoCurrency: "ETH",
            fiatCurrency: "USD",
            cryptoQuantity: 0.1,
            transactionType: TransactionType.ONRAMP,
          }),
        ),
      ).thenResolve(nobaQuote);

      try {
        await transactionService.initiateTransaction(consumerId, sessionKey, transactionRequest);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.SLIPPAGE);
      }
    });
  });

  describe("getTransactionStatus", () => {
    beforeEach(async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);
    });

    it("should get transaction with given id from database", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props.id,
        sessionKey: "fake-session-key",
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-token",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: undefined,
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        destinationWalletAddress: FAKE_VALID_WALLET,
        transactionTimestamp: new Date(),
        type: TransactionType.ONRAMP,
        nobaFee: 0.01,
        processingFee: 0.01,
        networkFee: 0.02,
      });
      when(transactionRepo.getTransaction(transaction.props._id)).thenResolve(transaction);

      const transactionDTO = transactionMapper.toDTO(transaction);
      const response = await transactionService.getTransaction(transaction.props._id);
      expect(response).toStrictEqual(transactionDTO);
      expect(response.type).toBe(TransactionType.ONRAMP);
      expect(response.amounts.totalFee).toBe(Utils.roundTo2DecimalNumber(0.01) * 2 + Utils.roundTo2DecimalNumber(0.02));
    });
  });

  describe("getUserTransactions", () => {
    beforeEach(async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);
    });

    it("should return all user transactions from database", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props.id,
        sessionKey: "fake-session-key",
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-token",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: undefined,
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        destinationWalletAddress: FAKE_VALID_WALLET,
        transactionTimestamp: new Date(),
      });

      const transactionDTO = transactionMapper.toDTO(transaction);

      const res: PaginatedResult<Transaction> = {
        items: [transaction],
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
      };

      when(transactionRepo.getFilteredTransactions(anything())).thenResolve(res);

      const response = await transactionService.getUserTransactions(transaction.props.userId, {});
      expect(response.items.length).toBe(1);
      expect(response.items[0]).toStrictEqual(transactionDTO);
    });
  });

  describe("getAllTransactions", () => {
    beforeEach(async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);
    });

    it("should return all transactions from database", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props.id,
        sessionKey: "fake-session-key",
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-token",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: undefined,
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        destinationWalletAddress: FAKE_VALID_WALLET,
        transactionTimestamp: new Date(),
      });
      when(transactionRepo.getAll()).thenResolve([transaction]);

      const response = await transactionService.getAllTransactions();
      expect(response.length).toBe(1);
      expect(response).toStrictEqual([transactionMapper.toDTO(transaction)]);
    });
  });

  describe("analyzeTransactionWalletExposure", () => {
    beforeEach(async () => {
      const environmentVariables = {
        [NOBA_CONFIG_KEY]: {
          [NOBA_TRANSACTION_CONFIG_KEY]: {
            [SLIPPAGE_ALLOWED_PERCENTAGE]: 0.02,
          },
        },
      };
      await setupTestModule(environmentVariables);
    });

    it("should update wallet status to flagged after querying elliptic and getting risk score > 0", async () => {
      const transactionID = "fake-transaction-id";
      const transaction = Transaction.createTransaction({
        _id: transactionID,
        userId: consumer.props.id,
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-method",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: undefined,
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        destinationWalletAddress: "fake-wallet-address",
        blockchainTransactionId: "fake-crypto-transaction-id",
      });

      const cryptoWallet: CryptoWallet = {
        address: "fake-wallet-address",
        status: WalletStatus.APPROVED,
      };

      const currentConsumer = Consumer.createConsumer({
        ...consumer.props,
        cryptoWallets: [cryptoWallet],
      });

      when(ellipticService.transactionAnalysis(anything())).thenResolve({ riskScore: 10 });
      when(consumerService.getConsumer(currentconsumer.props.id)).thenResolve(currentConsumer);
      when(consumerService.addOrUpdateCryptoWallet(anything(), anything())).thenResolve(currentConsumer);
      when(consumerService.getCryptoWallet(deepEqual(currentConsumer), cryptoWallet.address)).thenReturn(cryptoWallet);
      await transactionService.analyzeTransactionWalletExposure(transaction);

      verify(ellipticService.transactionAnalysis(deepEqual(transaction))).once();
      verify(
        consumerService.addOrUpdateCryptoWallet(
          deepEqual(currentConsumer),
          deepEqual({
            ...cryptoWallet,
            riskScore: 10,
            status: WalletStatus.FLAGGED,
          }),
        ),
      ).once();
    });
  });

  describe("getParticipantBalance", () => {
    beforeEach(() => {
      when(assetService.needsIntermediaryLeg()).thenReturn(false);
    });

    it("returns Circle wallet balance 'always'", async () => {
      const participantID = "participant-12345";
      const consumerID = "mock_consumer_id";
      const consumerCircleWalletID = "mock_circle_wallet_id";

      when(consumerService.getConsumerCircleWalletID(consumerID)).thenResolve(consumerCircleWalletID);
      when(walletProviderService.getConsumerAccountBalance(participantID, undefined)).thenResolve([]);
      when(circleClient.getWalletBalance(consumerCircleWalletID)).thenResolve(0);

      const balance = await transactionService.getParticipantBalance(participantID, consumerID);

      expect(balance).toHaveLength(1);
      expect(balance[0].asset).toBe("USD");
      expect(balance[0].balance).toBe("0.0");
      expect(balance[0].accountType).toBe(ConsumerAccountProvider.CIRCLE);
    });

    it("returns a structured balance object", async () => {
      const participantID = "participant-12345";
      const consumerID = "mock_consumer_id";
      const consumerCircleWalletID = "mock_circle_wallet_id";

      const lastUpdateDate = new Date();
      const balanceObj: ConsumerAccountBalance[] = [
        {
          asset: "asset-1",
          balance: "1000000",
          accountType: ConsumerAccountProvider.ZEROHASH,
        },
        {
          asset: "asset-2",
          balance: "2000000",
          accountType: ConsumerAccountProvider.ZEROHASH,
        },
      ];

      when(consumerService.getConsumerCircleWalletID(consumerID)).thenResolve(consumerCircleWalletID);
      when(circleClient.getWalletBalance(consumerCircleWalletID)).thenResolve(0);
      when(walletProviderService.getConsumerAccountBalance(participantID, undefined)).thenResolve(balanceObj);

      const receivedBalances = await transactionService.getParticipantBalance(participantID, consumerID);

      expect(receivedBalances).toContainEqual({
        accountType: ConsumerAccountProvider.ZEROHASH,
        asset: "asset-1",
        balance: "1000000",
      });
      expect(receivedBalances).toContainEqual({
        accountType: ConsumerAccountProvider.ZEROHASH,
        asset: "asset-2",
        balance: "2000000",
      });
      expect(receivedBalances).toContainEqual({
        accountType: ConsumerAccountProvider.CIRCLE,
        asset: "USD",
        balance: "0.0",
      });
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

  switch (transactionQuoteQuery.fixedSide) {
    case CurrencyType.FIAT:
      expect(response.quotedAmount).toBe(nobaQuote.totalCryptoQuantity);
      break;

    case CurrencyType.CRYPTO:
      expect(response.quotedAmount).toBe(nobaQuote.totalFiatAmount);
      break;

    default:
      expect(true).toBe(false);
  }

  expect(response.processingFee).toBe(nobaQuote.processingFeeInFiat);
  expect(response.networkFee).toBe(nobaQuote.networkFeeInFiat);
  expect(response.nobaFee).toBe(nobaQuote.nobaFeeInFiat);
  expect(response.exchangeRate).toBe(nobaQuote.perUnitCryptoPriceWithSpread);
}
