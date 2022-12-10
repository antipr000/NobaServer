const FAKE_VALID_WALLET = "fake-valid-wallet";

jest.mock("multicoin-address-validator", () => ({
  validate: jest.fn((walletAddress, _) => {
    if (walletAddress === FAKE_VALID_WALLET) return true;
    return false;
  }),
}));

import { LimitsService } from "../limits.service";

import { TransactionService } from "../transaction.service";
import { TransactionController } from "../transaction.controller";
import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { deepEqual, instance, when } from "ts-mockito";
import { getMockTransactionServiceWithDefaults } from "../mocks/mock.transactions.repo";
import { getMockLimitsServiceWithDefaults } from "../mocks/mock.limits.service";
import { TransactionQuoteQueryDTO } from "../dto/TransactionQuoteQueryDTO";
import { CurrencyType } from "../../../modules/common/domain/Types";
import { TransactionStatus, TransactionType } from "../domain/Types";
import { TransactionQuoteDTO } from "../dto/TransactionQuoteDTO";
import { X_NOBA_API_KEY } from "../../../modules/auth/domain/HeaderConstants";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { Transaction } from "../domain/Transaction";
import { PaymentProvider } from "../../../modules/consumer/domain/PaymentProvider";
import { TransactionMapper } from "../mapper/TransactionMapper";
import { ConsumerAccountProvider } from "../domain/AssetTypes";

describe("TransactionController", () => {
  let transactionService: TransactionService;
  let transactionController: TransactionController;
  let limitsService: LimitsService;
  let transactionMapper: TransactionMapper;

  const userId = "1234567890";
  const consumer = Consumer.createConsumer({
    _id: userId,
    email: "test@noba.com",
  });

  beforeAll(async () => {
    transactionMapper = new TransactionMapper();
    transactionService = getMockTransactionServiceWithDefaults();
    limitsService = getMockLimitsServiceWithDefaults();
    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        {
          provide: TransactionService,
          useFactory: () => instance(transactionService),
        },
        {
          provide: LimitsService,
          useFactory: () => instance(limitsService),
        },
      ],
      controllers: [TransactionController],
    }).compile();
    transactionController = app.get<TransactionController>(TransactionController);
  });

  describe("GET /transactions/quote", () => {
    it("should return proper quote for fixed side FIAT", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: 100,
        transactionType: TransactionType.NOBA_WALLET,
      };

      const transactionQuote: TransactionQuoteDTO = {
        quoteID: "fake-quote-1",
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.FIAT,
        fixedAmount: 100,
        quotedAmount: 0.1,
        processingFee: 0.02,
        nobaFee: 0.01,
        networkFee: 0,
        exchangeRate: 10,
      };

      when(
        transactionService.requestTransactionQuote(
          deepEqual({
            ...transactionQuoteQuery,
          }),
        ),
      ).thenResolve(transactionQuote);

      const response = await transactionController.getTransactionQuote({}, {}, transactionQuoteQuery);

      expect(response).toStrictEqual(transactionQuote);
    });

    it("should return proper quote for fixed side CRYPTO", async () => {
      const transactionQuoteQuery: TransactionQuoteQueryDTO = {
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        fixedAmount: 0.1,
        transactionType: TransactionType.ONRAMP,
      };

      const transactionQuote: TransactionQuoteDTO = {
        quoteID: "fake-quote-1",
        fiatCurrencyCode: "USD",
        cryptoCurrencyCode: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        fixedAmount: 0.1,
        quotedAmount: 102,
        processingFee: 0.02,
        nobaFee: 0.01,
        networkFee: 0.01,
        exchangeRate: 10,
      };

      when(
        transactionService.requestTransactionQuote(
          deepEqual({
            ...transactionQuoteQuery,
          }),
        ),
      ).thenResolve(transactionQuote);

      const response = await transactionController.getTransactionQuote(
        {},
        { user: { entity: consumer } },
        transactionQuoteQuery,
      );

      expect(response).toStrictEqual(transactionQuote);
    });
  });

  describe("GET /transactions/:transactionID", () => {
    it("gets transaction", async () => {
      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-1",
        transactionID: "faketransactionid",
        userId: consumer.props._id,
        sessionKey: "fake-session-1",
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-id",
          isCompleted: true,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        sourceWalletAddress: "fake-source-wallet",
        destinationWalletAddress: "fake-destination-wallet",
        leg1Amount: 100,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: CurrencyType.FIAT,
        type: TransactionType.ONRAMP,
        tradeQuoteID: "fake-trade-quote-id",
        nobaFee: 0.01,
        processingFee: 0.02,
        networkFee: 0.01,
        exchangeRate: 100,
        buyRate: 98,
        transactionStatus: TransactionStatus.COMPLETED,
        // TODO(#348): Evaluate if this timestamp is required.
        transactionTimestamp: new Date(),
        settledTimestamp: new Date(),
        zhWithdrawalID: "withdrawal-1234",
        executedQuoteTradeID: "executed-trade-1234",
        executedQuoteSettledTimestamp: new Date().valueOf(),
        executedCrypto: 0.1,
        amountPreSpread: 98,

        // Denotes the timestamp when the status of this tranaction is last updated.
        // The data-type is 'number' instead of 'string' to optimise index space used.
        lastProcessingTimestamp: new Date().valueOf(),
        lastStatusUpdateTimestamp: new Date().valueOf(),
      });

      const transactionDTO = transactionMapper.toDTO(transaction);

      when(transactionService.getTransaction(transaction.props._id)).thenResolve(transactionDTO);

      const result = await transactionController.getTransaction(
        { user: { entity: consumer } },
        transaction.props._id,
        consumer,
      );
      expect(result).toStrictEqual(transactionDTO);
    });
  });

  describe("GET /consumers/balances", () => {
    it("should return empty balance for undefined participant", async () => {
      const spy = jest.spyOn(transactionService, "getParticipantBalance");

      const response = await transactionController.getConsumerBalance(consumer);

      expect(spy).toHaveBeenCalledTimes(0);

      expect(response).toStrictEqual([]);
    });

    it("should return consumer balance", async () => {
      const updateDate = Date.now();
      const balances = [
        {
          asset: "asset-1",
          accountType: ConsumerAccountProvider.ZEROHASH,
          balance: "balance-1",
        },
        {
          asset: "asset-2",
          accountType: ConsumerAccountProvider.ZEROHASH,
          balance: "balance-2",
        },
      ];

      const zhParticipantCode = "1234567890";
      when(transactionService.getParticipantBalance(zhParticipantCode, userId)).thenResolve(balances);

      consumer.props.zhParticipantCode = zhParticipantCode;
      const response = await transactionController.getConsumerBalance(consumer);

      expect(response).toStrictEqual([
        {
          asset: "asset-1",
          accountType: ConsumerAccountProvider.ZEROHASH,
          balance: "balance-1",
        },
        {
          asset: "asset-2",
          accountType: ConsumerAccountProvider.ZEROHASH,
          balance: "balance-2",
        },
      ]);
    });
  });
});
