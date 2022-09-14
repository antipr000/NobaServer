import { Test, TestingModule } from "@nestjs/testing";
import { Transaction } from "../../../modules/transactions/domain/Transaction";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { EllipticService } from "../elliptic.service";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";
import mockAxios from "jest-mock-axios";
import {
  EllipticTransactionAnalysisRequest,
  EllipticTransactionAnalysisResponse,
} from "../domain/EllipticTransactionAnalysisTypes";
import { BadRequestException } from "@nestjs/common";

describe("Elliptic Tests", () => {
  jest.setTimeout(10000);
  let ellipticService: EllipticService;
  const systemTime = 2000000;
  let dateSpy;
  beforeAll(async () => {
    dateSpy = jest.spyOn(Date, "now").mockImplementation(() => systemTime);
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          elliptic: {
            apiKey: "fake-api-key",
            baseUrl: "fake-base-url",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [EllipticService],
    }).compile();

    ellipticService = app.get<EllipticService>(EllipticService);
  });

  afterAll(() => {
    dateSpy.mockRestore();
  });

  describe("transactionAnalysis", () => {
    it("Should return risk score obtained from elliptic for transaction", async () => {
      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: "fake-consumer",
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        paymentMethodID: "fake-payment-method",
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
        risk_score: 9.038007,
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

      const responsePromise = ellipticService.transactionAnalysis(transaction);

      const ellipticRequestBody: EllipticTransactionAnalysisRequest = {
        subject: {
          asset: transaction.props.leg2,
          blockchain: "",
          type: "transaction",
          hash: transaction.props.blockchainTransactionId,
          output_type: "address",
          output_address: transaction.props.destinationWalletAddress,
        },
        type: "destination_of_funds",
        customer_reference: transaction.props.userId,
      };

      expect(mockAxios.post).toHaveBeenCalledWith("fake-base-url/analyses/synchronous", ellipticRequestBody, {
        headers: {
          "x-access-key": "fake-api-key",
          "x-access-sign": computeSignature(
            JSON.stringify(ellipticRequestBody),
            systemTime,
            "/analyses/synchronous",
            "POST",
          ),
          "x-access-timestamp": systemTime,
        },
      });

      mockAxios.mockResponse({
        data: ellipticResponse,
      });

      const response = await responsePromise;

      expect(response.riskScore).toBe(ellipticResponse.risk_score);
    });

    it("should throw BadRequestException when elliptic returns error", async () => {
      const transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: "fake-consumer",
        sessionKey: "fake-session",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        paymentMethodID: "fake-payment-method",
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        destinationWalletAddress: "fake-wallet",
        partnerID: "12345",
        blockchainTransactionId: "fake-crypto-transaction-id",
      });

      const responsePromise = ellipticService.transactionAnalysis(transaction);

      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockError({
        name: "InvalidTxOutput",
        message:
          "The submitted ${outputType} ${outputIdentifier} is not present in the outputs of transaction ${txHash}",
      });

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe(
          "The submitted ${outputType} ${outputIdentifier} is not present in the outputs of transaction ${txHash}",
        );
      }
    });
  });
});

function computeSignature(requestBody: string, timestamp: number, requestUrl: string, requestMethod: string) {
  return `${timestamp}${requestMethod}${requestUrl}${requestBody}`;
}
