import mockAxios from "jest-mock-axios";
const FAKE_VALID_WALLET = "fake-valid-wallet";

jest.mock("multicoin-address-validator", () => ({
  validate: jest.fn((walletAddress, _) => {
    if (walletAddress === FAKE_VALID_WALLET) return true;
    return false;
  }),
}));

import { Test, TestingModule } from "@nestjs/testing";
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
import { Transaction } from "../domain/Transaction";
import { TransactionStatus, TransactionType } from "../domain/Types";
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
import { CombinedNobaQuote, NobaQuote } from "../domain/AssetTypes";
import { Partner } from "../../../modules/partner/domain/Partner";
import { WebhookType } from "../../../modules/partner/domain/WebhookTypes";
import { CreateTransactionDTO } from "../dto/CreateTransactionDTO";
import { TransactionMapper } from "../mapper/TransactionMapper";
import {
  TransactionSubmissionException,
  TransactionSubmissionFailureExceptionText,
} from "../exceptions/TransactionSubmissionException";
import { EllipticService } from "../../../modules/common/elliptic.service";
import { getMockEllipticServiceWithDefaults } from "../../../modules/common/mocks/mock.elliptic.service";
import { PaginatedResult } from "../../../core/infra/PaginationTypes";

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
  let emailService: EmailService;
  let partnerService: PartnerService;
  let assetServiceFactory: AssetServiceFactory;
  let assetService: AssetService;
  let transactionMapper: TransactionMapper;
  let ellipticService: EllipticService;

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
    ellipticService = getMockEllipticServiceWithDefaults();
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
        {
          provide: EllipticService,
          useFactory: () => instance(ellipticService),
        },
      ],
    }).compile();
    transactionService = app.get<TransactionService>(TransactionService);

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
      when(consumerService.getCryptoWallet(consumer, cryptoWallet.address)).thenReturn(cryptoWallet);
      when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve(updatedConsumer);
      when(consumerService.addOrUpdateCryptoWallet(updatedConsumer, anything())).thenResolve(updatedConsumer);
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
      };

      try {
        await transactionService.requestTransactionQuote(transactionQuoteQuery);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should return correct quote for 'FIAT' fixed side", async () => {
      const partnerID = "partner-12345";
      const partner: Partner = Partner.createPartner({
        _id: partnerID,
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerService.getPartner(partnerID)).thenResolve(partner);

      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: 10,
        partnerID: partnerID,
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

          totalFiatAmount: 13,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
      };

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
            fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
            fiatAmount: Number(transactionQuoteQuery.fixedAmount),
            discount: {
              fixedCreditCardFeeDiscountPercent: 0,
              networkFeeDiscountPercent: 0,
              nobaFeeDiscountPercent: 0,
              nobaSpreadDiscountPercent: 0,
              processingFeeDiscountPercent: 0,
            },
          }),
        ),
      ).thenResolve(nobaQuote);

      const response = await transactionService.requestTransactionQuote(transactionQuoteQuery);
      assertOnRequestTransactionQuoteResponse(response, nobaQuote.quote, transactionQuoteQuery);
    });

    it("should return correct quote for 'FIAT' fixed side when assetService needs intermediary leg", async () => {
      const partnerID = "partner-12345";
      const partner: Partner = Partner.createPartner({
        _id: partnerID,
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerService.getPartner(partnerID)).thenResolve(partner);
      when(currencyService.getCryptocurrency("axlUSDCMoonbeam")).thenResolve({
        ticker: "axlUSDCMoonbeam",
        name: "Moonbeam",
        iconPath: "",
        precision: 8,
        provider: "Squid",
      });

      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "axlUSDCMoonbeam",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: 10,
        partnerID: partnerID,
      };

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "axlUSDCMoonbeam",

          processingFeeInFiat: 1,
          networkFeeInFiat: 1,
          nobaFeeInFiat: 1,
          amountPreSpread: 1,

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

          totalFiatAmount: 13,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
      };

      when(assetService.needsIntermediaryLeg()).thenReturn(true);
      when(assetService.getIntermediaryLeg()).thenReturn("USDC.POLYGON");

      when(
        assetService.getQuoteForSpecifiedFiatAmount(
          deepEqual({
            cryptoCurrency: transactionQuoteQuery.cryptoCurrencyCode,
            fiatCurrency: transactionQuoteQuery.fiatCurrencyCode,
            fiatAmount: Number(transactionQuoteQuery.fixedAmount),
            intermediateCryptoCurrency: "USDC.POLYGON",
            discount: {
              fixedCreditCardFeeDiscountPercent: 0,
              networkFeeDiscountPercent: 0,
              nobaFeeDiscountPercent: 0,
              nobaSpreadDiscountPercent: 0,
              processingFeeDiscountPercent: 0,
            },
          }),
        ),
      ).thenResolve(nobaQuote);

      const response = await transactionService.requestTransactionQuote(transactionQuoteQuery);
      assertOnRequestTransactionQuoteResponse(response, nobaQuote.quote, transactionQuoteQuery);
    });

    it("should return correct quote for 'CRYPTO' fixed side", async () => {
      const partnerID = "partner-12345";
      const partner: Partner = Partner.createPartner({
        _id: partnerID,
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerService.getPartner(partnerID)).thenResolve(partner);

      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        fixedAmount: 0.1,
        partnerID: partnerID,
      };

      const nobaQuote: NobaQuote = {
        quoteID: "fake-quote",
        fiatCurrency: "USD",
        cryptoCurrency: "ETH",

        processingFeeInFiat: 0.01,
        networkFeeInFiat: 0.01,
        nobaFeeInFiat: 0.01,
        amountPreSpread: 1000,

        totalFiatAmount: 1000,
        totalCryptoQuantity: 1000,
        perUnitCryptoPriceWithoutSpread: 1000,
        perUnitCryptoPriceWithSpread: 1000,
      };

      when(
        assetService.getQuoteForSpecifiedCryptoQuantity(
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

      const responsePromise = transactionService.callTransactionConfirmWebhook(consumer, transaction);
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
    beforeEach(() => {
      when(assetService.needsIntermediaryLeg()).thenReturn(false);
    });
    it("throws TransactionSubmissionException when destination wallet address is invalid", async () => {
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

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      try {
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.INVALID_WALLET);
      }
    });

    it("throws TransactionSubmissionException when leg2 is invalid", async () => {
      when(currencyService.getCryptocurrency("ABC")).thenResolve(null);

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

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      when(currencyService.getSupportedCryptocurrencies()).thenResolve([]);
      try {
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.UNKNOWN_CRYPTO);
      }
    });

    it("throws TransactionSubmissionException when leg1 is invalid", async () => {
      when(currencyService.getFiatCurrency("ABC")).thenResolve(null);

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

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerService.getPartner(partnerId)).thenResolve(partner);

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
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.UNKNOWN_FIAT);
      }
    });

    it("should throw BadRequestException when intermediary leg is needed and fixed side is 'CRYPTO'", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "axlUSDCMoonbeam",
        leg1Amount: 100,
        leg2Amount: 0.1,
        fixedSide: CurrencyType.CRYPTO,
        destinationWalletAddress: FAKE_VALID_WALLET,
      };

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
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe(`Fixed side crypto is not allowed for ${transactionRequest.leg2}`);
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

      const nobaQuote: CombinedNobaQuote = {
        quote: {
          quoteID: "fake-quote",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",

          processingFeeInFiat: 0.01,
          networkFeeInFiat: 0.01,
          nobaFeeInFiat: 0.01,
          amountPreSpread: 0.01,

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

          totalFiatAmount: 1000,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
      };

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
          }),
        ),
      ).thenResolve(nobaQuote);
      try {
        await transactionService.initiateTransaction(consumerId, partnerId, sessionKey, transactionRequest);
      } catch (e) {
        expect(e).toBeInstanceOf(TransactionSubmissionException);
        const err = e as TransactionSubmissionException;
        expect(err.disposition).toBe(TransactionSubmissionFailureExceptionText.SLIPPAGE);
      }
    });

    it("should create transaction entry in DB with fixed FIAT side", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
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

          totalFiatAmount: 100,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
      };

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
          }),
        ),
      ).thenResolve(nobaQuote);

      const responseTransaction = Transaction.createTransaction({
        _id: "fake-id-12345",
        transactionID: "fake-transaction-id",
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

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      const response = await transactionService.initiateTransaction(
        consumerId,
        partnerId,
        sessionKey,
        transactionRequest,
      );
      delete response._id;
      delete response.transactionID;
      delete response.transactionTimestamp;
      expect(response).toStrictEqual(responseTransactionDTO);
    });

    it("should create transaction entry in DB with fixed FIAT side and intermediary leg is needed", async () => {
      const consumerId = consumer.props._id;
      const intermediaryLeg = "USDC.POLYGON";
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const exchangeRate = 1000;

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
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

          totalFiatAmount: 100,
          perUnitCryptoPriceWithoutSpread: 1000,
          perUnitCryptoPriceWithSpread: 1000,
        },
      };

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
        paymentMethodID: transactionRequest.paymentToken,
        leg1Amount: transactionRequest.leg1Amount,
        leg2Amount: transactionRequest.leg2Amount,
        leg1: transactionRequest.leg1,
        leg2: transactionRequest.leg2,
        intermediaryLeg: intermediaryLeg,
        transactionStatus: TransactionStatus.PENDING,
        partnerID: partnerId,
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

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Mock Partner",
        apiKey: "mockPublicKey",
        secretKey: "mockPrivateKey",
      });

      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      const response = await transactionService.initiateTransaction(
        consumerId,
        partnerId,
        sessionKey,
        transactionRequest,
      );
      delete response._id;
      delete response.transactionID;
      delete response.transactionTimestamp;
      expect(response).toStrictEqual(responseTransactionDTO);
    });

    it("should create transaction entry in DB with fixed CRYPTO side", async () => {
      const consumerId = consumer.props._id;
      const partnerId = "fake-partner-1";
      const sessionKey = "fake-session-key";
      const fiatAmount = 100;
      const conversionRate = 1000;

      const transactionRequest: CreateTransactionDTO = {
        paymentToken: "fake-payment-token",
        type: TransactionType.ONRAMP,
        leg1: "USD",
        leg2: "ETH",
        leg1Amount: fiatAmount,
        leg2Amount: fiatAmount / conversionRate,
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
        amountPreSpread: 0.01,

        totalFiatAmount: 100,
        totalCryptoQuantity: 0.1,
        perUnitCryptoPriceWithoutSpread: 1000,
        perUnitCryptoPriceWithSpread: 1000,
      };

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
            fiatCurrency: "USD",
            cryptoCurrency: "ETH",
            cryptoQuantity: 0.1,
          }),
        ),
      ).thenResolve(nobaQuote);

      const responseTransaction = Transaction.createTransaction({
        _id: "fake-id-12345",
        transactionID: "fake-transaction-id",
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
        networkFee: nobaQuote.networkFeeInFiat,
        nobaFee: nobaQuote.nobaFeeInFiat,
        processingFee: nobaQuote.processingFeeInFiat,
        exchangeRate: conversionRate,
      });

      const responseTransactionDTO = transactionMapper.toDTO(responseTransaction);
      delete responseTransactionDTO._id; // Delete id as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionID; // Delete transactionID as it would be autogenerated so cannot be compared
      delete responseTransactionDTO.transactionTimestamp; // Delete timestamp as it makes tests flaky

      when(transactionRepo.createTransaction(anything())).thenResolve(responseTransaction);

      const response = await transactionService.initiateTransaction(
        consumerId,
        partnerId,
        sessionKey,
        transactionRequest,
      );
      delete response._id;
      delete response.transactionID;
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
      const response = await transactionService.getTransaction(transaction.props._id);
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

      const res: PaginatedResult<Transaction> = {
        items: [transaction],
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
      };

      when(
        transactionRepo.getUserTransactions(transaction.props.userId, transaction.props.partnerID, anything()),
      ).thenResolve(res);

      const response = await transactionService.getUserTransactions(
        transaction.props.userId,
        transaction.props.partnerID,
        {},
      );
      expect(response.items.length).toBe(1);
      expect(response.items[0]).toStrictEqual(transactionDTO);
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

  describe("analyzeTransactionWalletExposure", () => {
    it("should update wallet status to flagged after querying elliptic and getting risk score > 0", async () => {
      const transactionID = "fake-transaction-id";
      const transaction = Transaction.createTransaction({
        _id: transactionID,
        userId: consumer.props._id,
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        paymentMethodID: "fake-payment-method",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        destinationWalletAddress: "fake-wallet-address",
        partnerID: "12345",
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
      when(consumerService.getConsumer(currentConsumer.props._id)).thenResolve(currentConsumer);
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
  expect(response.exchangeRate).toBe(nobaQuote.perUnitCryptoPriceWithSpread);
}
