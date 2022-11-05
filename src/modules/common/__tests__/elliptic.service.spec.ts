import { Test, TestingModule } from "@nestjs/testing";
import { Transaction } from "../../../modules/transactions/domain/Transaction";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { EllipticService } from "../elliptic.service";
import { CurrencyService } from "../../common/currency.service";
import { getMockCurrencyServiceWithDefaults } from "../../common/mocks/mock.currency.service";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";
import { instance, when } from "ts-mockito";
// Note: I tried jest-mock-axios library but because of nested async code I couldn't get it to work
import axios from "axios";
import {
  EllipticTransactionAnalysisRequest,
  EllipticTransactionAnalysisResponse,
} from "../domain/EllipticTransactionAnalysisTypes";
import { BadRequestException } from "@nestjs/common";
import { createHmac } from "crypto";
import * as ConfigurationUtils from "../../../config/ConfigurationUtils";
import { PaymentProvider } from "../../../modules/consumer/domain/PaymentProvider";

describe("Elliptic Tests", () => {
  jest.setTimeout(10000);
  let ellipticService: EllipticService;
  let currencyService: CurrencyService;

  const systemTime = 2000000;
  let dateSpy;
  beforeAll(async () => {
    dateSpy = jest.spyOn(Date, "now").mockImplementation(() => systemTime);
    currencyService = getMockCurrencyServiceWithDefaults();
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          elliptic: {
            apiKey: "fake-api-key",
            secretKey: "fake-secret-key",
            baseUrl: "fake-base-url",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [
        EllipticService,
        {
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
      ],
    }).compile();

    ellipticService = app.get<EllipticService>(EllipticService);
  });

  afterAll(() => {
    dateSpy.mockRestore();
  });

  describe("transactionAnalysis", () => {
    jest.spyOn(ConfigurationUtils, "isProductionEnvironment").mockImplementation(() => true);
    it("Should return risk score obtained from elliptic for transaction without output type", async () => {
      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: "fake-consumer",
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-token",
          isSettled: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        destinationWalletAddress: "fake-wallet",
        partnerID: "12345",
        blockchainTransactionId: "fake-crypto-transaction-id",
      });

      const ellipticResponse: EllipticTransactionAnalysisResponse = {
        id: "b7535048-76f8-4f60-bdd3-9d659298f9e7",
        type: "source_of_funds",
        analysed_at: "2022-09-14T03:07:26Z",
        risk_score: -1,
        predictive: false,
        customer: {
          id: "fake-consumer",
          reference: "foobar",
        },
        blockchain_info: {
          address: {
            has_sent: true,
            has_received: true,
          },
          value: 38383838,
        },
        process_status: "running",
      };

      when(currencyService.getCryptocurrency("ETH")).thenResolve({
        iconPath: "",
        name: "",
        ticker: "ETH",
        precision: 6,
        type: "Base",
      });

      axios.post = jest.fn().mockResolvedValueOnce({ data: ellipticResponse });

      const response = await ellipticService.transactionAnalysis(transaction);

      const ellipticRequestBody: EllipticTransactionAnalysisRequest = {
        subject: {
          asset: "ETH",
          type: "transaction",
          hash: transaction.props.blockchainTransactionId,
        },
        type: "destination_of_funds",
        customer_reference: transaction.props.userId,
      };

      expect(axios.post).toBeCalledWith("fake-base-url/v2/analyses/synchronous", ellipticRequestBody, {
        headers: {
          "x-access-key": "fake-api-key",
          "x-access-sign": computeSignature(
            JSON.stringify(ellipticRequestBody),
            systemTime,
            "/v2/analyses/synchronous",
            "POST",
          ),
          "x-access-timestamp": systemTime,
        },
      });

      expect(response.riskScore).toBe(ellipticResponse.risk_score);
    });

    it("Should return risk score obtained from elliptic for transaction with output type", async () => {
      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: "fake-consumer",
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-method",
          isSettled: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "LTC",
        destinationWalletAddress: "fake-wallet",
        partnerID: "12345",
        blockchainTransactionId: "fake-crypto-transaction-id",
      });

      when(currencyService.getCryptocurrency("LTC")).thenResolve({
        iconPath: "",
        name: "",
        ticker: "LTC",
        precision: 6,
        type: "Base",
      });

      const ellipticResponse: EllipticTransactionAnalysisResponse = {
        id: "b7535048-76f8-4f60-bdd3-9d659298f9e7",
        type: "source_of_funds",
        analysed_at: "2022-09-14T03:07:26Z",
        risk_score: -1,
        predictive: false,
        customer: {
          id: "fake-consumer",
          reference: "foobar",
        },
        blockchain_info: {
          address: {
            has_sent: true,
            has_received: true,
          },
          value: 38383838,
        },
        process_status: "running",
      };

      axios.post = jest.fn().mockResolvedValueOnce({ data: ellipticResponse });

      const response = await ellipticService.transactionAnalysis(transaction);

      const ellipticRequestBody: EllipticTransactionAnalysisRequest = {
        subject: {
          asset: "LTC",
          type: "transaction",
          hash: transaction.props.blockchainTransactionId,
          output_type: "address",
          output_address: transaction.props.destinationWalletAddress,
        },
        type: "destination_of_funds",
        customer_reference: transaction.props.userId,
      };

      expect(axios.post).toBeCalledWith("fake-base-url/v2/analyses/synchronous", ellipticRequestBody, {
        headers: {
          "x-access-key": "fake-api-key",
          "x-access-sign": computeSignature(
            JSON.stringify(ellipticRequestBody),
            systemTime,
            "/v2/analyses/synchronous",
            "POST",
          ),
          "x-access-timestamp": systemTime,
        },
      });

      expect(response.riskScore).toBe(ellipticResponse.risk_score);
    });

    it("Should return risk score obtained from elliptic for transaction with ERC20 asset type", async () => {
      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: "fake-consumer",
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-method",
          isSettled: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "AAVE.ETH",
        destinationWalletAddress: "fake-wallet",
        partnerID: "12345",
        blockchainTransactionId: "fake-crypto-transaction-id",
      });

      const ellipticResponse: EllipticTransactionAnalysisResponse = {
        id: "b7535048-76f8-4f60-bdd3-9d659298f9e7",
        type: "source_of_funds",
        analysed_at: "2022-09-14T03:07:26Z",
        risk_score: -1,
        predictive: false,
        customer: {
          id: "fake-consumer",
          reference: "foobar",
        },
        blockchain_info: {
          address: {
            has_sent: true,
            has_received: true,
          },
          value: 38383838,
        },
        process_status: "running",
      };

      when(currencyService.getCryptocurrency("AAVE.ETH")).thenResolve({
        iconPath: "",
        name: "",
        ticker: "AAVE.ETH",
        precision: 6,
        type: "ERC20",
      });

      axios.post = jest.fn().mockResolvedValueOnce({ data: ellipticResponse });

      const response = await ellipticService.transactionAnalysis(transaction);

      const ellipticRequestBody: EllipticTransactionAnalysisRequest = {
        subject: {
          asset: "ERC20",
          type: "transaction",
          hash: transaction.props.blockchainTransactionId,
        },
        type: "destination_of_funds",
        customer_reference: transaction.props.userId,
      };

      expect(axios.post).toHaveBeenCalledWith("fake-base-url/v2/analyses/synchronous", ellipticRequestBody, {
        headers: {
          "x-access-key": "fake-api-key",
          "x-access-sign": computeSignature(
            JSON.stringify(ellipticRequestBody),
            systemTime,
            "/v2/analyses/synchronous",
            "POST",
          ),
          "x-access-timestamp": systemTime,
        },
      });

      expect(response.riskScore).toBe(ellipticResponse.risk_score);
    });

    it("Should return an error due to unknown currency", async () => {
      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: "fake-consumer",
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-method",
          isSettled: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "XXX",
        destinationWalletAddress: "fake-wallet",
        partnerID: "12345",
        blockchainTransactionId: "fake-crypto-transaction-id",
      });

      when(currencyService.getCryptocurrency("XXX")).thenResolve(null);

      expect(async () => {
        await ellipticService.transactionAnalysis(transaction);
      }).rejects.toThrowError(Error);
    });

    it("should throw BadRequestException when elliptic returns error", async () => {
      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: "fake-consumer",
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-method",
          isSettled: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        destinationWalletAddress: "fake-wallet",
        partnerID: "12345",
        blockchainTransactionId: "fake-crypto-transaction-id",
      });

      when(currencyService.getCryptocurrency("ETH")).thenResolve({
        iconPath: "",
        name: "",
        ticker: "ETH",
        precision: 6,
        type: "Base",
      });

      axios.post = jest.fn().mockImplementation(() => {
        throw new Error("Error");
      });

      expect(async () => {
        await ellipticService.transactionAnalysis(transaction);
        expect(axios.post).toHaveBeenCalled();
      }).rejects.toThrowError(BadRequestException);
    });
  });

  describe("transactionAnalysis - non-prod", () => {
    it("Should not call the Elliptic API in non-prod environments", async () => {
      jest.spyOn(ConfigurationUtils, "isProductionEnvironment").mockImplementation(() => false);

      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: "fake-consumer",
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: "fake-payment-token",
          isSettled: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        destinationWalletAddress: "fake-wallet",
        partnerID: "12345",
        blockchainTransactionId: "fake-crypto-transaction-id",
      });

      when(currencyService.getCryptocurrency("ETH")).thenResolve({
        iconPath: "",
        name: "",
        ticker: "ETH",
        precision: 6,
        type: "Base",
      });

      axios.post = jest.fn();

      await ellipticService.transactionAnalysis(transaction);

      expect(axios.post).toHaveBeenCalledTimes(0);
    });
  });
});

function computeSignature(requestBody: string, timestamp: number, requestUrl: string, requestMethod: string) {
  const plainText = `${timestamp}${requestMethod}${requestUrl}${requestBody}`;
  return createHmac("sha256", Buffer.from("fake-secret-key", "base64")).update(plainText).digest("base64");
}
