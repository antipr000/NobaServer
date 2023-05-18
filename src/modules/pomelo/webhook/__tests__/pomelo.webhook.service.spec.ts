import { Test, TestingModule } from "@nestjs/testing";
import {
  POMELO_AFFINITY_GROUP,
  POMELO_CLIENT_ID,
  POMELO_CLIENT_SECRET,
  POMELO_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { PomeloTransactionService } from "../pomelo.webhook.service";
import {
  PomeloAdjustmentType,
  PomeloTransactionAdjustmentRequest,
  PomeloTransactionAuthzDetailStatus,
  PomeloTransactionAuthzRequest,
  PomeloTransactionAuthzResponse,
  PomeloTransactionAuthzSummaryStatus,
} from "../../dto/pomelo.transaction.service.dto";
import {
  PomeloCurrency,
  PomeloEntryMode,
  PomeloOrigin,
  PomeloPointType,
  PomeloSource,
  PomeloTransaction,
  PomeloTransactionStatus,
  PomeloTransactionType,
} from "../../domain/PomeloTransaction";
import { PomeloRepo } from "../../repos/pomelo.repo";
import { TransactionService } from "../../../transaction/transaction.service";
import { PomeloService } from "../../public/pomelo.service";
import { getMockPomeloRepoWithDefaults } from "../../repos/mocks/mock.pomelo.repo";
import { getMockTransactionServiceWithDefaults } from "../../../transaction/mocks/mock.transaction.service";
import { getMockPomeloServiceWithDefaults } from "../../public/mocks/mock.pomelo.service";
import { getMockCircleServiceWithDefaults } from "../../../circle/public/mocks/mock.circle.service";
import { POMELO_REPO_PROVIDER } from "../../repos/pomelo.repo.module";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { CircleService } from "../../../../modules/circle/public/circle.service";
import { uuid } from "uuidv4";
import { Currency } from "../../../../modules/transaction/domain/TransactionTypes";
import { Transaction, TransactionStatus } from "../../../../modules/transaction/domain/Transaction";
import { WorkflowName } from "../../../../infra/temporal/workflow";
import { UpdateWalletBalanceServiceDTO } from "../../../../modules/psp/domain/UpdateWalletBalanceServiceDTO";
import { CircleTransferStatus } from "../../../../modules/psp/domain/CircleTypes";
import { ExchangeRateService } from "../../../../modules/exchangerate/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../../modules/exchangerate/mocks/mock.exchangerate.service";
import { ExchangeRateDTO } from "../../../../modules/exchangerate/dto/exchangerate.dto";

const getRawTransactionAuthzBodyBuffer = (): Buffer => {
  const data = `{
    "transaction": {
      "id": "ctx-55f02942-823c-4f94-8a28-4439dcabf894",
      "country_code": "ESP",
      "type": "PURCHASE",
      "point_type": "ECOMMERCE",
      "entry_mode": "MANUAL",
      "origin": "INTERNATIONAL",
      "local_date_time": "2023-03-28T09:03:34",
      "original_transaction_id": null
    },
    "merchant": {
      "id": "111111111111111",
      "mcc": "5045",
      "address": null,
      "name": "Computer Software"
    },
    "card": {
      "id": "crd-1629483284114MGA9BF",
      "product_type": "PREPAID",
      "provider": "MASTERCARD",
      "last_four": "6708"
    },
    "user": {
      "id": "usr-1629293693904DM2U4T"
    },
    "amount": {
      "local": {
        "total": 999.9,
        "currency": "ARS"
      },
      "transaction": {
        "total": 9.45,
        "currency": "EUR"
      },
      "settlement": {
        "total": 11.0,
        "currency": "USD"
      },
      "details": [{
        "type": "BASE",
        "currency": "ARS",
        "amount": 999.9,
        "name": "BASE"
      }]
    }
  }`;
  return Buffer.from(data, "utf8");
};
const transactionAuthzValidTimestamp = "1680024224";
const transactionAuthzValidSignature = "hmac-sha256 CwWJxPZFqLu2IxGvFxKepAPk6nhaFmJ1xzyH+khLvuo=";

const getRawTransactionAdjustmentBodyBuffer = (): Buffer => {
  const data = `{
    "transaction" : {
      "id" : "ctx-7f0c57e2-272d-4869-829f-4c8b3234b9dc",
      "country_code" : "ESP",
      "type" : "REFUND",
      "point_type" : "ECOMMERCE",
      "entry_mode" : "MANUAL",
      "origin": "INTERNATIONAL",
      "local_date_time" : "2023-04-10T11:25:18",
      "original_transaction_id" : "ctx-cca460e3-869b-4a44-bca4-8a984f16d609"
    },
    "merchant" : {
      "id" : "111111111111111",
      "mcc" : "5045",
      "address" : null,
      "name" : "Computer Software"
    },
    "card" : {
      "id" : "crd-1629483284114MGA9BF",
      "product_type" : "PREPAID",
      "provider" : "MASTERCARD",
      "last_four" : "6708"
    },
    "user" : {
      "id" : "usr-1629293693904DM2U4T"
    },
    "amount" : {
      "local" : {
        "total" : 999.9,
        "currency" : "COP"
      },
      "transaction" : {
        "total" : 9.45,
        "currency" : "USD"
      },
      "settlement" : {
        "total" : 11.0,
        "currency" : "USD"
      },
      "details" : [ {
        "type" : "BASE",
        "currency" : "ARS",
        "amount" : 999.9,
        "name" : "BASE"
      } ]
    }
  }`;
  return Buffer.from(data, "utf8");
};
const transactionAdjustmentValidTimestamp = "1681149318";
const transactionAdjustmentCreditValidSignature = "hmac-sha256 PrOm7CXoK8vdlR5Y1qyej5IfDgFJOulymotKArqKAcE=";
const transactionAdjustmentDebitValidSignature = "hmac-sha256 i2JeD/3D/gvcDFPS2ccpuTZLbVQbjiexn52tYEJgJTw=";

describe("PomeloTransactionServiceTests", () => {
  jest.setTimeout(20000);

  let pomeloTransactionService: PomeloTransactionService;
  let mockPomeloRepo: PomeloRepo;
  let mockTransactionService: TransactionService;
  let mockPomeloService: PomeloService;
  let mockCircleService: CircleService;
  let mockExchangeRateService: ExchangeRateService;

  let app: TestingModule;

  beforeEach(async () => {
    mockPomeloRepo = getMockPomeloRepoWithDefaults();
    mockTransactionService = getMockTransactionServiceWithDefaults();
    mockPomeloService = getMockPomeloServiceWithDefaults();
    mockCircleService = getMockCircleServiceWithDefaults();
    mockExchangeRateService = getMockExchangeRateServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/ tmp / test - ${Math.floor(Math.random() * 1000000)}.log`,
      [POMELO_CONFIG_KEY]: {
        [POMELO_CLIENT_ID]: "POMELO_CLIENT_ID",
        [POMELO_CLIENT_SECRET]: "POMELO_CLIENT_SECRET",
        [POMELO_AFFINITY_GROUP]: "POMELO_AFFINITY_GROUP",
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: POMELO_REPO_PROVIDER,
          useFactory: () => instance(mockPomeloRepo),
        },
        {
          provide: TransactionService,
          useFactory: () => instance(mockTransactionService),
        },
        {
          provide: PomeloService,
          useFactory: () => instance(mockPomeloService),
        },
        {
          provide: CircleService,
          useFactory: () => instance(mockCircleService),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(mockExchangeRateService),
        },
        PomeloTransactionService,
      ],
    }).compile();

    pomeloTransactionService = app.get<PomeloTransactionService>(PomeloTransactionService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("authorizeTransaction", () => {
    describe("API contract error scenarios", () => {
      let validRequest: PomeloTransactionAuthzRequest;

      beforeEach(() => {
        validRequest = {
          endpoint: "/transactions/authorizations",
          rawBodyBuffer: getRawTransactionAuthzBodyBuffer(),
          rawSignature: transactionAuthzValidSignature,
          timestamp: transactionAuthzValidTimestamp,
          idempotencyKey: "IDEMPOTENCY_KEY",

          localAmount: 5000,
          localCurrency: PomeloCurrency.COP,
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 5000,
          transactionCurrency: PomeloCurrency.COP,
          pomeloCardID: "POMELO_CARD_ID",
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          pomeloUserID: "POMELO_USER_ID",
          transactionType: PomeloTransactionType.PURCHASE,
          merchantName: "MERCHANT_NAME",
          merchantMCC: "MCC",
          countryCode: "COL",
          entryMode: PomeloEntryMode.MANUAL,
          pointType: PomeloPointType.ECOMMERCE,
          origin: PomeloOrigin.INTERNATIONAL,
          source: PomeloSource.ONLINE,
        };
      });

      it("should reject the transaction with OTHER status if the 'endpoint' mismatched", async () => {
        validRequest.endpoint = "/transactions/invalid-authorizations";

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(
          validRequest,
        );

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      describe("should reject with OTHER status if 'signature' mismatched", () => {
        it("should return REJECTED if 'timestamp' differs by a few milliseconds", async () => {
          let request: PomeloTransactionAuthzRequest = validRequest;
          request.timestamp = "1680024225";

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should return REJECTED if 'rawBodyBuffer' is not valid", async () => {
          let request: PomeloTransactionAuthzRequest = validRequest;
          request.rawBodyBuffer = Buffer.from("DUMMY_BODY", "utf8");

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should return REJECTED if 'signature' is not valid", async () => {
          let request: PomeloTransactionAuthzRequest = validRequest;
          request.rawSignature = "INVALID_SIGNATURE";

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });
      });
    });

    describe("Noba Business logic tests (Valid Pomelo Signature)", () => {
      const request: PomeloTransactionAuthzRequest = {
        endpoint: "/transactions/authorizations",
        rawBodyBuffer: getRawTransactionAuthzBodyBuffer(),
        rawSignature: transactionAuthzValidSignature,
        timestamp: transactionAuthzValidTimestamp,
        idempotencyKey: "POMELO_IDEMPOTENCY_KEY",

        localAmount: 5000,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 50,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 5000,
        transactionCurrency: PomeloCurrency.COP,
        pomeloCardID: "POMELO_CARD_ID",
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloUserID: "POMELO_USER_ID",
        transactionType: PomeloTransactionType.PURCHASE,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        countryCode: "COL",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
      };
      const pomeloTransaction: PomeloTransaction = {
        id: uuid(),
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        parentPomeloTransactionID: null,
        localAmount: 5000,
        localCurrency: PomeloCurrency.COP,
        amountInUSD: 50,
        nobaTransactionID: "NOBA_TRANSACTION_ID", // Not the one sent in request.
        pomeloCardID: "POMELO_CARD_ID",
        pomeloIdempotencyKey: "IDEMPOTENCY_KEY",
        status: PomeloTransactionStatus.PENDING,
        pomeloTransactionType: PomeloTransactionType.PURCHASE,
        pomeloUserID: "POMELO_USER_ID",
        settlementAmount: 50,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 5000,
        transactionCurrency: PomeloCurrency.COP,
        countryCode: "COL",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
      const nobaConsumerID = "NOBA_CONSUMER_ID";
      const circleWalletID: string = "CIRCLE_WALLET_ID";
      const circleWalletBalance: number = 50;
      const exchangeRate: ExchangeRateDTO = {
        bankRate: 100,
        nobaRate: 100,
        denominatorCurrency: Currency.COP,
        numeratorCurrency: Currency.USD,
      };
      const transaction: Transaction = {
        id: "NOBA_TRANSACTION_ID",
        exchangeRate: 0.01,
        workflowName: WorkflowName.CARD_WITHDRAWAL,
        sessionKey: "SESSION",
        status: TransactionStatus.INITIATED,
        transactionFees: [],
        transactionRef: "TRANSACTION_REF",
        debitConsumerID: "NOBA_CONSUMER_ID",
        debitAmount: 50,
        debitCurrency: Currency.USD,
        creditAmount: 5000,
        creditCurrency: Currency.COP,
        memo: "",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
      const debitWalletResponse: UpdateWalletBalanceServiceDTO = {
        id: uuid(),
        status: CircleTransferStatus.SUCCESS,
        createdAt: Date.now().toString(),
      };

      it("should appove the transaction with a valid response signature", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(exchangeRate);
        when(mockTransactionService.initiateTransaction(anything())).thenResolve(transaction);
        when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve(
          debitWalletResponse,
        );
        when(
          mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
        ).thenResolve();

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
          message: "",
        });
        const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
        expect(createPomeloTransactionRequestParams).toStrictEqual({
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          parentPomeloTransactionID: null,
          localAmount: 5000,
          localCurrency: "COP",
          amountInUSD: 50,
          nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
          pomeloCardID: "POMELO_CARD_ID",
          pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
          countryCode: "COL",
          entryMode: PomeloEntryMode.MANUAL,
          origin: PomeloOrigin.INTERNATIONAL,
          pointType: PomeloPointType.ECOMMERCE,
          pomeloTransactionType: PomeloTransactionType.PURCHASE,
          pomeloUserID: "POMELO_USER_ID",
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 5000,
          transactionCurrency: PomeloCurrency.COP,
          source: PomeloSource.ONLINE,
          merchantName: "MERCHANT_NAME",
          merchantMCC: "MCC",
        });
        const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
        expect(createNobaTransactionRequestParams).toStrictEqual({
          type: WorkflowName.CARD_WITHDRAWAL,
          cardWithdrawalRequest: {
            debitAmountInUSD: 50,
            creditCurrency: Currency.COP,
            creditAmount: 5000,
            debitConsumerID: "NOBA_CONSUMER_ID",
            exchangeRate: 0.01,
            nobaTransactionID: "NOBA_TRANSACTION_ID",
            memo: "Transfer of 5000 COP to MERCHANT_NAME",
          },
        });
      });

      it("should appove the transaction and deduct the amount rounded to 2 decimal places", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve({
          ...pomeloTransaction,
          localAmount: 4924.9,
        });
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(exchangeRate);
        when(mockTransactionService.initiateTransaction(anything())).thenResolve(transaction);
        when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve(
          debitWalletResponse,
        );
        when(
          mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
        ).thenResolve();

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction({
          ...request,
          localAmount: 4924.9,
        });

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
          message: "",
        });
        const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
        expect(createPomeloTransactionRequestParams).toStrictEqual({
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          parentPomeloTransactionID: null,
          localAmount: 4924.9,
          localCurrency: "COP",
          amountInUSD: 50,
          nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
          pomeloCardID: "POMELO_CARD_ID",
          pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
          countryCode: "COL",
          entryMode: PomeloEntryMode.MANUAL,
          origin: PomeloOrigin.INTERNATIONAL,
          pointType: PomeloPointType.ECOMMERCE,
          pomeloTransactionType: PomeloTransactionType.PURCHASE,
          pomeloUserID: "POMELO_USER_ID",
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 5000,
          transactionCurrency: PomeloCurrency.COP,
          source: PomeloSource.ONLINE,
          merchantName: "MERCHANT_NAME",
          merchantMCC: "MCC",
        });
        const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
        expect(createNobaTransactionRequestParams).toStrictEqual({
          type: WorkflowName.CARD_WITHDRAWAL,
          cardWithdrawalRequest: {
            debitAmountInUSD: 49.25,
            creditCurrency: Currency.COP,
            creditAmount: 4924.9,
            debitConsumerID: "NOBA_CONSUMER_ID",
            exchangeRate: 0.01,
            nobaTransactionID: "NOBA_TRANSACTION_ID",
            memo: "Transfer of 4924.9 COP to MERCHANT_NAME",
          },
        });
      });

      it("should reject the transaction with a INSUFFICIENT_FUNDS response if wallet doesn't have enough balance", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance - 0.01);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(exchangeRate);
        when(
          mockPomeloRepo.updatePomeloTransactionStatus(
            "POMELO_TRANSACTION_ID",
            PomeloTransactionStatus.INSUFFICIENT_FUNDS,
          ),
        ).thenResolve();

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });

        const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
        expect(createPomeloTransactionRequestParams).toStrictEqual({
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          parentPomeloTransactionID: null,
          localAmount: 5000,
          localCurrency: "COP",
          amountInUSD: 50,
          nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
          pomeloCardID: "POMELO_CARD_ID",
          pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
          countryCode: "COL",
          entryMode: PomeloEntryMode.MANUAL,
          origin: PomeloOrigin.INTERNATIONAL,
          pointType: PomeloPointType.ECOMMERCE,
          pomeloTransactionType: PomeloTransactionType.PURCHASE,
          pomeloUserID: "POMELO_USER_ID",
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 5000,
          transactionCurrency: PomeloCurrency.COP,
          source: PomeloSource.ONLINE,
          merchantName: "MERCHANT_NAME",
          merchantMCC: "MCC",
        });

        const [pomeloTransactionIDParamInUpdateRequest, pomeloTransactionStatusInUpdateRequest] = capture(
          mockPomeloRepo.updatePomeloTransactionStatus,
        ).last();
        expect(pomeloTransactionIDParamInUpdateRequest).toBe("POMELO_TRANSACTION_ID");
        expect(pomeloTransactionStatusInUpdateRequest).toBe(PomeloTransactionStatus.INSUFFICIENT_FUNDS);
      });

      it("shouldn't recreate PomeloTransaction if it already exists", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
        when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenResolve(
          pomeloTransaction,
        );
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(exchangeRate);
        when(mockTransactionService.initiateTransaction(anything())).thenResolve(transaction);
        when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve(
          debitWalletResponse,
        );
        when(
          mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
        ).thenResolve();

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
          message: "",
        });

        const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
        expect(createPomeloTransactionRequestParams).toStrictEqual({
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          parentPomeloTransactionID: null,
          localAmount: 5000,
          localCurrency: "COP",
          amountInUSD: 50,
          nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
          pomeloCardID: "POMELO_CARD_ID",
          pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
          countryCode: "COL",
          entryMode: PomeloEntryMode.MANUAL,
          origin: PomeloOrigin.INTERNATIONAL,
          pointType: PomeloPointType.ECOMMERCE,
          pomeloTransactionType: PomeloTransactionType.PURCHASE,
          pomeloUserID: "POMELO_USER_ID",
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 5000,
          transactionCurrency: PomeloCurrency.COP,
          source: PomeloSource.ONLINE,
          merchantName: "MERCHANT_NAME",
          merchantMCC: "MCC",
        });

        const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
        expect(createNobaTransactionRequestParams).toStrictEqual({
          type: WorkflowName.CARD_WITHDRAWAL,
          cardWithdrawalRequest: {
            debitAmountInUSD: 50,
            creditCurrency: Currency.COP,
            creditAmount: 5000,
            debitConsumerID: "NOBA_CONSUMER_ID",
            exchangeRate: 0.01,
            nobaTransactionID: "NOBA_TRANSACTION_ID",
            memo: "Transfer of 5000 COP to MERCHANT_NAME",
          },
        });
      });

      it("shouldn't try re-executing actions if the status in PomeloTransaction is not PENDING", async () => {
        const localPomeloTransaction: PomeloTransaction = JSON.parse(JSON.stringify(pomeloTransaction));
        localPomeloTransaction.status = PomeloTransactionStatus.INSUFFICIENT_FUNDS;

        when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
        when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenResolve(
          localPomeloTransaction,
        );

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("shouldn't recreate NobaTransaction if it already exists", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(exchangeRate);
        when(mockTransactionService.initiateTransaction(anything())).thenReject(new Error("Already Exists"));
        when(mockTransactionService.getTransactionByTransactionID("NOBA_TRANSACTION_ID")).thenResolve(transaction);
        when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve(
          debitWalletResponse,
        );
        when(
          mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
        ).thenResolve();

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
          message: "",
        });

        const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
        expect(createPomeloTransactionRequestParams).toStrictEqual({
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          parentPomeloTransactionID: null,
          localAmount: 5000,
          localCurrency: "COP",
          amountInUSD: 50,
          nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
          pomeloCardID: "POMELO_CARD_ID",
          pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
          countryCode: "COL",
          entryMode: PomeloEntryMode.MANUAL,
          origin: PomeloOrigin.INTERNATIONAL,
          pointType: PomeloPointType.ECOMMERCE,
          pomeloTransactionType: PomeloTransactionType.PURCHASE,
          pomeloUserID: "POMELO_USER_ID",
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 5000,
          transactionCurrency: PomeloCurrency.COP,
          source: PomeloSource.ONLINE,
          merchantName: "MERCHANT_NAME",
          merchantMCC: "MCC",
        });

        const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
        expect(createNobaTransactionRequestParams).toStrictEqual({
          type: WorkflowName.CARD_WITHDRAWAL,
          cardWithdrawalRequest: {
            debitAmountInUSD: 50,
            creditCurrency: Currency.COP,
            creditAmount: 5000,
            debitConsumerID: "NOBA_CONSUMER_ID",
            exchangeRate: 0.01,
            nobaTransactionID: "NOBA_TRANSACTION_ID",
            memo: "Transfer of 5000 COP to MERCHANT_NAME",
          },
        });
      });

      it("should map unexpected failure in PomeloTransaction creation to SYSTEM_ERROR", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
        when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenReject(
          new Error("Some error"),
        );

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("should map unexpected failure in fetching nobaConsumerID to SYSTEM_ERROR", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
        when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenResolve(
          pomeloTransaction,
        );
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenReject(
          new Error("Internal error"),
        );

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("should map unexpected failure in fetching circle wallet to SYSTEM_ERROR", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
        when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenResolve(
          pomeloTransaction,
        );
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenReject(new Error("Internal error"));

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("should map unexpected failure in fetching exchange rates to SYSTEM_ERROR", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenReject(
          new Error("Internal Error"),
        );

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("should map unexpected failure in creating Noba Transaction to SYSTEM_ERROR", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(exchangeRate);
        when(mockTransactionService.initiateTransaction(anything())).thenReject(new Error("Internal Error"));
        when(mockTransactionService.getTransactionByTransactionID(anyString())).thenReject(new Error("Internal Error"));

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("should map unexpected failure in debiting Circle wallet to SYSTEM_ERROR", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(exchangeRate);
        when(mockTransactionService.initiateTransaction(anything())).thenResolve(transaction);
        when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenReject(
          new Error("Internal Error"),
        );

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("should reject the transaction with INSUFFICIENT_FUNDS if Circle returns failure", async () => {
        when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
        when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
          nobaConsumerID,
        );
        when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
        when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
        when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve(exchangeRate);
        when(mockTransactionService.initiateTransaction(anything())).thenResolve(transaction);
        when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve({
          ...debitWalletResponse,
          status: CircleTransferStatus.FAILURE,
        });
        when(
          mockPomeloRepo.updatePomeloTransactionStatus(
            "POMELO_TRANSACTION_ID",
            PomeloTransactionStatus.INSUFFICIENT_FUNDS,
          ),
        ).thenResolve();

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });
    });
  });

  describe("adjustTransaction", () => {
    describe("API contract error scenarios", () => {
      let validRequest: PomeloTransactionAdjustmentRequest;

      beforeEach(() => {
        validRequest = {
          endpoint: "/transactions/adjustments/credit",
          rawBodyBuffer: getRawTransactionAdjustmentBodyBuffer(),
          rawSignature: transactionAdjustmentCreditValidSignature,
          timestamp: transactionAdjustmentValidTimestamp,
          idempotencyKey: "IDEMPOTENCY_KEY",

          adjustmentType: PomeloAdjustmentType.CREDIT,
          pomeloOriginalTransactionID: "PARENT_POMELO_TRANSACTION_ID",
          localAmount: 5000,
          localCurrency: PomeloCurrency.COP,
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.USD,
          transactionAmount: 5000,
          transactionCurrency: PomeloCurrency.COP,
          pomeloCardID: "POMELO_CARD_ID",
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          pomeloUserID: "POMELO_USER_ID",
          transactionType: PomeloTransactionType.PURCHASE,
          merchantName: "MERCHANT_NAME",
          merchantMCC: "MCC",
          countryCode: "COL",
          entryMode: PomeloEntryMode.MANUAL,
          pointType: PomeloPointType.ECOMMERCE,
          origin: PomeloOrigin.INTERNATIONAL,
          source: PomeloSource.ONLINE,
        };
      });

      it("should reject the transaction with OTHER status if the 'endpoint' mismatched", async () => {
        validRequest.endpoint = "/transactions/adjustments/invalid-type";

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(validRequest);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      describe("should reject with OTHER status if 'signature' mismatched", () => {
        it("should return REJECTED if 'timestamp' differs by a few milliseconds", async () => {
          let request: PomeloTransactionAdjustmentRequest = validRequest;
          request.timestamp = "1681145220";

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(request);

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should return REJECTED if 'rawBodyBuffer' is not valid", async () => {
          let request: PomeloTransactionAdjustmentRequest = validRequest;
          request.rawBodyBuffer = Buffer.from("DUMMY_BODY", "utf8");

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(request);

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should return REJECTED if 'signature' is not valid", async () => {
          let request: PomeloTransactionAdjustmentRequest = validRequest;
          request.rawSignature = "INVALID_SIGNATURE";

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(request);

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });
      });
    });

    describe("Noba Business logic tests (Valid Pomelo Signature)", () => {
      const nobaConsumerID = "NOBA_CONSUMER_ID";
      const circleWalletID: string = "CIRCLE_WALLET_ID";
      const circleWalletBalance: number = 50;

      const creditRequest: PomeloTransactionAdjustmentRequest = {
        endpoint: "/transactions/adjustments/credit",
        rawBodyBuffer: getRawTransactionAdjustmentBodyBuffer(),
        rawSignature: transactionAdjustmentCreditValidSignature,
        timestamp: transactionAdjustmentValidTimestamp,
        idempotencyKey: "POMELO_IDEMPOTENCY_KEY",

        adjustmentType: PomeloAdjustmentType.CREDIT,
        pomeloOriginalTransactionID: "PARENT_POMELO_TRANSACTION_ID",
        localAmount: 5000,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 50,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 5000,
        transactionCurrency: PomeloCurrency.COP,
        pomeloCardID: "POMELO_CARD_ID",
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloUserID: "POMELO_USER_ID",
        transactionType: PomeloTransactionType.PAYMENT,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        countryCode: "COL",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
      };
      const debitRequest: PomeloTransactionAdjustmentRequest = {
        endpoint: "/transactions/adjustments/debit",
        rawBodyBuffer: getRawTransactionAdjustmentBodyBuffer(),
        rawSignature: transactionAdjustmentDebitValidSignature,
        timestamp: transactionAdjustmentValidTimestamp,
        idempotencyKey: "POMELO_IDEMPOTENCY_KEY",

        adjustmentType: PomeloAdjustmentType.DEBIT,
        pomeloOriginalTransactionID: "PARENT_POMELO_TRANSACTION_ID",
        localAmount: 5000,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 50,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 5000,
        transactionCurrency: PomeloCurrency.COP,
        pomeloCardID: "POMELO_CARD_ID",
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloUserID: "POMELO_USER_ID",
        transactionType: PomeloTransactionType.REVERSAL_PAYMENT,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        countryCode: "COL",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
      };
      const pomeloTransaction: PomeloTransaction = {
        id: uuid(),
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        parentPomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
        localAmount: 5000,
        localCurrency: PomeloCurrency.COP,
        amountInUSD: 50,
        nobaTransactionID: "NOBA_TRANSACTION_ID", // Not the one sent in request.
        pomeloCardID: "POMELO_CARD_ID",
        pomeloUserID: "POMELO_USER_ID",
        pomeloTransactionType: PomeloTransactionType.REVERSAL_PAYMENT,
        settlementAmount: 50,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 5000,
        transactionCurrency: PomeloCurrency.COP,
        pomeloIdempotencyKey: "IDEMPOTENCY_KEY",
        status: PomeloTransactionStatus.PENDING,
        countryCode: "COL",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
      const parentPomeloTransaction: PomeloTransaction = {
        id: uuid(),
        pomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
        parentPomeloTransactionID: null,
        localAmount: 5000,
        localCurrency: PomeloCurrency.COP,
        amountInUSD: 50,
        nobaTransactionID: "PARENT_NOBA_TRANSACTION_ID", // Not the one sent in request.
        pomeloCardID: "POMELO_CARD_ID",
        pomeloUserID: "POMELO_USER_ID",
        pomeloTransactionType: PomeloTransactionType.REVERSAL_PAYMENT,
        settlementAmount: 50,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 5000,
        transactionCurrency: PomeloCurrency.COP,
        pomeloIdempotencyKey: "IDEMPOTENCY_KEY",
        status: PomeloTransactionStatus.PENDING,
        countryCode: "COL",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
      const creditTransaction: Transaction = {
        id: "NOBA_TRANSACTION_ID",
        exchangeRate: 0.01,
        workflowName: WorkflowName.CARD_REVERSAL,
        sessionKey: "SESSION",
        status: TransactionStatus.INITIATED,
        transactionFees: [],
        transactionRef: "TRANSACTION_REF",
        creditConsumerID: "NOBA_CONSUMER_ID",
        creditAmount: 50,
        creditCurrency: Currency.USD,
        memo: "",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
      const debitTransaction: Transaction = {
        id: "NOBA_TRANSACTION_ID",
        exchangeRate: 0.01,
        workflowName: WorkflowName.CARD_REVERSAL,
        sessionKey: "SESSION",
        status: TransactionStatus.INITIATED,
        transactionFees: [],
        transactionRef: "TRANSACTION_REF",
        debitConsumerID: "NOBA_CONSUMER_ID",
        debitAmount: 50,
        debitCurrency: Currency.USD,
        memo: "",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
      const parentCreditTransaction: Transaction = {
        id: "PARENT_NOBA_TRANSACTION_ID",
        exchangeRate: 0.01,
        workflowName: WorkflowName.CARD_REVERSAL,
        sessionKey: "SESSION",
        status: TransactionStatus.INITIATED,
        transactionFees: [],
        transactionRef: "TRANSACTION_REF",
        creditConsumerID: "NOBA_CONSUMER_ID",
        creditAmount: 50,
        creditCurrency: Currency.USD,
        memo: "",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
      const parentDebitTransaction: Transaction = {
        id: "PARENT_NOBA_TRANSACTION_ID",
        exchangeRate: 0.01,
        workflowName: WorkflowName.CARD_REVERSAL,
        sessionKey: "SESSION",
        status: TransactionStatus.INITIATED,
        transactionFees: [],
        transactionRef: "TRANSACTION_REF",
        debitConsumerID: "NOBA_CONSUMER_ID",
        debitAmount: 50,
        debitCurrency: Currency.USD,
        memo: "",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };
      const debitOrCreditWalletResponse: UpdateWalletBalanceServiceDTO = {
        id: uuid(),
        status: CircleTransferStatus.SUCCESS,
        createdAt: Date.now().toString(),
      };

      describe("CREDIT", () => {
        it("should appove the transaction with a valid response signature", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve({
            ...parentCreditTransaction,
            creditAmount: 49,
            exchangeRate: 0.67,
          });
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockTransactionService.initiateTransaction(anything())).thenResolve(creditTransaction);
          when(mockCircleService.creditWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 49)).thenResolve(
            debitOrCreditWalletResponse,
          );
          when(
            mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
          ).thenResolve();

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            creditRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
            message: "",
          });

          const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
          expect(createPomeloTransactionRequestParams).toStrictEqual({
            pomeloTransactionID: "POMELO_TRANSACTION_ID",
            parentPomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
            localAmount: 5000,
            localCurrency: "COP",
            amountInUSD: 50,
            nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
            pomeloCardID: "POMELO_CARD_ID",
            pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
            countryCode: "COL",
            entryMode: PomeloEntryMode.MANUAL,
            origin: PomeloOrigin.INTERNATIONAL,
            pointType: PomeloPointType.ECOMMERCE,
            pomeloTransactionType: PomeloTransactionType.PAYMENT,
            pomeloUserID: "POMELO_USER_ID",
            settlementAmount: 50,
            settlementCurrency: PomeloCurrency.USD,
            transactionAmount: 5000,
            transactionCurrency: PomeloCurrency.COP,
            source: PomeloSource.ONLINE,
            merchantName: "MERCHANT_NAME",
            merchantMCC: "MCC",
          });
          const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
          expect(createNobaTransactionRequestParams).toStrictEqual({
            type: WorkflowName.CARD_REVERSAL,
            cardReversalRequest: {
              amountInUSD: 49, // comes from the parent Noba Transaction
              consumerID: "NOBA_CONSUMER_ID",
              type: "CREDIT",
              exchangeRate: 0.67,
              nobaTransactionID: "NOBA_TRANSACTION_ID",
              memo: "Transfer of 5000 COP to MERCHANT_NAME",
            },
          });
        });

        it("should 'NOT' reject the transaction with a INSUFFICIENT_FUNDS response if wallet doesn't have enough balance", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve(
            parentCreditTransaction,
          );
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockTransactionService.initiateTransaction(anything())).thenResolve(creditTransaction);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance - 0.01);
          when(mockCircleService.creditWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve(
            debitOrCreditWalletResponse,
          );
          when(
            mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
          ).thenResolve();

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            creditRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
            message: "",
          });

          const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
          expect(createPomeloTransactionRequestParams).toStrictEqual({
            pomeloTransactionID: "POMELO_TRANSACTION_ID",
            parentPomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
            localAmount: 5000,
            localCurrency: "COP",
            amountInUSD: 50,
            nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
            pomeloCardID: "POMELO_CARD_ID",
            pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
            countryCode: "COL",
            entryMode: PomeloEntryMode.MANUAL,
            origin: PomeloOrigin.INTERNATIONAL,
            pointType: PomeloPointType.ECOMMERCE,
            pomeloTransactionType: PomeloTransactionType.PAYMENT,
            pomeloUserID: "POMELO_USER_ID",
            settlementAmount: 50,
            settlementCurrency: PomeloCurrency.USD,
            transactionAmount: 5000,
            transactionCurrency: PomeloCurrency.COP,
            source: PomeloSource.ONLINE,
            merchantName: "MERCHANT_NAME",
            merchantMCC: "MCC",
          });

          const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
          expect(createNobaTransactionRequestParams).toStrictEqual({
            type: WorkflowName.CARD_REVERSAL,
            cardReversalRequest: {
              amountInUSD: 50, // comes from the parent Noba Transaction
              consumerID: "NOBA_CONSUMER_ID",
              type: "CREDIT",
              exchangeRate: 0.01,
              nobaTransactionID: "NOBA_TRANSACTION_ID",
              memo: "Transfer of 5000 COP to MERCHANT_NAME",
            },
          });
        });
      });

      describe("DEBIT", () => {
        it("should appove the transaction with a valid response signature", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve({
            ...parentDebitTransaction,
            debitAmount: 49.55,
            exchangeRate: 0.97,
          });
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockTransactionService.initiateTransaction(anything())).thenResolve(debitTransaction);
          when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 49.55)).thenResolve(
            debitOrCreditWalletResponse,
          );
          when(
            mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
          ).thenResolve();

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
            message: "",
          });

          const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
          expect(createPomeloTransactionRequestParams).toStrictEqual({
            pomeloTransactionID: "POMELO_TRANSACTION_ID",
            parentPomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
            localAmount: 5000,
            localCurrency: "COP",
            amountInUSD: 50,
            nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
            pomeloCardID: "POMELO_CARD_ID",
            pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
            countryCode: "COL",
            entryMode: PomeloEntryMode.MANUAL,
            origin: PomeloOrigin.INTERNATIONAL,
            pointType: PomeloPointType.ECOMMERCE,
            pomeloTransactionType: PomeloTransactionType.REVERSAL_PAYMENT,
            pomeloUserID: "POMELO_USER_ID",
            settlementAmount: 50,
            settlementCurrency: PomeloCurrency.USD,
            transactionAmount: 5000,
            transactionCurrency: PomeloCurrency.COP,
            source: PomeloSource.ONLINE,
            merchantName: "MERCHANT_NAME",
            merchantMCC: "MCC",
          });
          const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
          expect(createNobaTransactionRequestParams).toStrictEqual({
            type: WorkflowName.CARD_REVERSAL,
            cardReversalRequest: {
              amountInUSD: 49.55, // comes from the parent Noba Transaction
              consumerID: "NOBA_CONSUMER_ID",
              type: "DEBIT",
              exchangeRate: 0.97,
              nobaTransactionID: "NOBA_TRANSACTION_ID",
              memo: "Transfer of 5000 COP to MERCHANT_NAME",
            },
          });
        });

        it("should appove the transaction without any roundings of the value in orginal NobaTransaction", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve({
            ...parentDebitTransaction,
            debitAmount: 49.99,
          });
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve({
            ...pomeloTransaction,
            localAmount: 4924.9,
          });
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockTransactionService.initiateTransaction(anything())).thenResolve(debitTransaction);
          when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 49.99)).thenResolve(
            debitOrCreditWalletResponse,
          );
          when(
            mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
          ).thenResolve();

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction({
            ...debitRequest,
            localAmount: 4924.9,
          });

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
            message: "",
          });
          const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
          expect(createPomeloTransactionRequestParams).toStrictEqual({
            pomeloTransactionID: "POMELO_TRANSACTION_ID",
            parentPomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
            localAmount: 4924.9,
            localCurrency: "COP",
            amountInUSD: 50,
            nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
            pomeloCardID: "POMELO_CARD_ID",
            pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
            countryCode: "COL",
            entryMode: PomeloEntryMode.MANUAL,
            origin: PomeloOrigin.INTERNATIONAL,
            pointType: PomeloPointType.ECOMMERCE,
            pomeloTransactionType: PomeloTransactionType.REVERSAL_PAYMENT,
            pomeloUserID: "POMELO_USER_ID",
            settlementAmount: 50,
            settlementCurrency: PomeloCurrency.USD,
            transactionAmount: 5000,
            transactionCurrency: PomeloCurrency.COP,
            source: PomeloSource.ONLINE,
            merchantName: "MERCHANT_NAME",
            merchantMCC: "MCC",
          });
          const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
          expect(createNobaTransactionRequestParams).toStrictEqual({
            type: WorkflowName.CARD_REVERSAL,
            cardReversalRequest: {
              amountInUSD: 49.99,
              consumerID: "NOBA_CONSUMER_ID",
              type: "DEBIT",
              exchangeRate: 0.01,
              nobaTransactionID: "NOBA_TRANSACTION_ID",
              memo: "Transfer of 4924.9 COP to MERCHANT_NAME",
            },
          });
        });
      });

      describe("Error scenarios (all DEBIT)", () => {
        it("should reject the transaction with a INSUFFICIENT_FUNDS response if wallet doesn't have enough balance", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve(
            parentDebitTransaction,
          );
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance - 0.01);
          when(
            mockPomeloRepo.updatePomeloTransactionStatus(
              "POMELO_TRANSACTION_ID",
              PomeloTransactionStatus.INSUFFICIENT_FUNDS,
            ),
          ).thenResolve();

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });

          const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
          expect(createPomeloTransactionRequestParams).toStrictEqual({
            pomeloTransactionID: "POMELO_TRANSACTION_ID",
            parentPomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
            localAmount: 5000,
            localCurrency: "COP",
            amountInUSD: 50,
            nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
            pomeloCardID: "POMELO_CARD_ID",
            pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
            countryCode: "COL",
            entryMode: PomeloEntryMode.MANUAL,
            origin: PomeloOrigin.INTERNATIONAL,
            pointType: PomeloPointType.ECOMMERCE,
            pomeloTransactionType: PomeloTransactionType.REVERSAL_PAYMENT,
            pomeloUserID: "POMELO_USER_ID",
            settlementAmount: 50,
            settlementCurrency: PomeloCurrency.USD,
            transactionAmount: 5000,
            transactionCurrency: PomeloCurrency.COP,
            source: PomeloSource.ONLINE,
            merchantName: "MERCHANT_NAME",
            merchantMCC: "MCC",
          });

          const [pomeloTransactionIDParamInUpdateRequest, pomeloTransactionStatusInUpdateRequest] = capture(
            mockPomeloRepo.updatePomeloTransactionStatus,
          ).last();
          expect(pomeloTransactionIDParamInUpdateRequest).toBe("POMELO_TRANSACTION_ID");
          expect(pomeloTransactionStatusInUpdateRequest).toBe(PomeloTransactionStatus.INSUFFICIENT_FUNDS);
        });

        it("shouldn't recreate PomeloTransaction if it already exists", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve(
            parentDebitTransaction,
          );
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
          when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenResolve(
            pomeloTransaction,
          );
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockTransactionService.initiateTransaction(anything())).thenResolve(debitTransaction);
          when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve(
            debitOrCreditWalletResponse,
          );
          when(
            mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
          ).thenResolve();

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
            message: "",
          });

          const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
          expect(createPomeloTransactionRequestParams).toStrictEqual({
            pomeloTransactionID: "POMELO_TRANSACTION_ID",
            parentPomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
            localAmount: 5000,
            localCurrency: "COP",
            amountInUSD: 50,
            nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
            pomeloCardID: "POMELO_CARD_ID",
            pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
            countryCode: "COL",
            entryMode: PomeloEntryMode.MANUAL,
            origin: PomeloOrigin.INTERNATIONAL,
            pointType: PomeloPointType.ECOMMERCE,
            pomeloTransactionType: PomeloTransactionType.REVERSAL_PAYMENT,
            pomeloUserID: "POMELO_USER_ID",
            settlementAmount: 50,
            settlementCurrency: PomeloCurrency.USD,
            transactionAmount: 5000,
            transactionCurrency: PomeloCurrency.COP,
            source: PomeloSource.ONLINE,
            merchantName: "MERCHANT_NAME",
            merchantMCC: "MCC",
          });

          const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
          expect(createNobaTransactionRequestParams).toStrictEqual({
            type: WorkflowName.CARD_REVERSAL,
            cardReversalRequest: {
              amountInUSD: 50,
              consumerID: "NOBA_CONSUMER_ID",
              type: "DEBIT",
              exchangeRate: 0.01,
              nobaTransactionID: "NOBA_TRANSACTION_ID",
              memo: "Transfer of 5000 COP to MERCHANT_NAME",
            },
          });
        });

        it("shouldn't try re-executing actions if the status in PomeloTransaction is not PENDING", async () => {
          const localPomeloTransaction: PomeloTransaction = JSON.parse(JSON.stringify(pomeloTransaction));
          localPomeloTransaction.status = PomeloTransactionStatus.INSUFFICIENT_FUNDS;

          when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
          when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenResolve(
            localPomeloTransaction,
          );

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("shouldn't recreate NobaTransaction if it already exists", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve(
            parentDebitTransaction,
          );
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockTransactionService.initiateTransaction(anything())).thenReject(new Error("Already Exists"));
          when(mockTransactionService.getTransactionByTransactionID("NOBA_TRANSACTION_ID")).thenResolve(
            creditTransaction,
          );
          when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve(
            debitOrCreditWalletResponse,
          );
          when(
            mockPomeloRepo.updatePomeloTransactionStatus("POMELO_TRANSACTION_ID", PomeloTransactionStatus.APPROVED),
          ).thenResolve();

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
            message: "",
          });

          const [createPomeloTransactionRequestParams] = capture(mockPomeloRepo.createPomeloTransaction).last();
          expect(createPomeloTransactionRequestParams).toStrictEqual({
            pomeloTransactionID: "POMELO_TRANSACTION_ID",
            parentPomeloTransactionID: "PARENT_POMELO_TRANSACTION_ID",
            localAmount: 5000,
            localCurrency: "COP",
            amountInUSD: 50,
            nobaTransactionID: expect.not.stringContaining("POMELO_TRANSACTION_ID"),
            pomeloCardID: "POMELO_CARD_ID",
            pomeloIdempotencyKey: "POMELO_IDEMPOTENCY_KEY",
            countryCode: "COL",
            entryMode: PomeloEntryMode.MANUAL,
            origin: PomeloOrigin.INTERNATIONAL,
            pointType: PomeloPointType.ECOMMERCE,
            pomeloTransactionType: PomeloTransactionType.REVERSAL_PAYMENT,
            pomeloUserID: "POMELO_USER_ID",
            settlementAmount: 50,
            settlementCurrency: PomeloCurrency.USD,
            transactionAmount: 5000,
            transactionCurrency: PomeloCurrency.COP,
            source: PomeloSource.ONLINE,
            merchantName: "MERCHANT_NAME",
            merchantMCC: "MCC",
          });

          const [createNobaTransactionRequestParams] = capture(mockTransactionService.initiateTransaction).last();
          expect(createNobaTransactionRequestParams).toStrictEqual({
            type: WorkflowName.CARD_REVERSAL,
            cardReversalRequest: {
              amountInUSD: 50,
              consumerID: "NOBA_CONSUMER_ID",
              type: "DEBIT",
              exchangeRate: 0.01,
              nobaTransactionID: "NOBA_TRANSACTION_ID",
              memo: "Transfer of 5000 COP to MERCHANT_NAME",
            },
          });
        });

        it("should map unexpected failure in PomeloTransaction creation to SYSTEM_ERROR", async () => {
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
          when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenReject(
            new Error("Some error"),
          );

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should map unexpected failure in fetching nobaConsumerID to SYSTEM_ERROR", async () => {
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
          when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenResolve(
            pomeloTransaction,
          );
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenReject(
            new Error("Internal error"),
          );

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should map unexpected failure in fetching circle wallet to SYSTEM_ERROR", async () => {
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenReject(new Error("Already exists"));
          when(mockPomeloRepo.getPomeloTransactionByPomeloIdempotencyKey("POMELO_IDEMPOTENCY_KEY")).thenResolve(
            pomeloTransaction,
          );
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenReject(new Error("Internal error"));

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should send SYSTEM_ERROR if parent Pomelo Transaction is not found", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            null,
          );
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenReject(
            new Error("Internal Error"),
          );

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should send SYSTEM_ERROR if parent Noba Transaction is not found", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve(null);
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockExchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenReject(
            new Error("Internal Error"),
          );

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should map unexpected failure in creating Noba Transaction to SYSTEM_ERROR", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve(
            parentDebitTransaction,
          );
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockTransactionService.initiateTransaction(anything())).thenReject(new Error("Internal Error"));
          when(mockTransactionService.getTransactionByTransactionID(anyString())).thenReject(
            new Error("Internal Error"),
          );

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should map unexpected failure in debiting Circle wallet to SYSTEM_ERROR", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve(
            parentDebitTransaction,
          );
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockTransactionService.initiateTransaction(anything())).thenResolve(debitTransaction);
          when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenReject(
            new Error("Internal Error"),
          );

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.SYSTEM_ERROR,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });

        it("should reject the transaction with INSUFFICIENT_FUNDS if Circle returns failure", async () => {
          when(mockPomeloRepo.getPomeloTransactionByPomeloTransactionID("PARENT_POMELO_TRANSACTION_ID")).thenResolve(
            parentPomeloTransaction,
          );
          when(mockTransactionService.getTransactionByTransactionID("PARENT_NOBA_TRANSACTION_ID")).thenResolve(
            parentDebitTransaction,
          );
          when(mockPomeloRepo.createPomeloTransaction(anything())).thenResolve(pomeloTransaction);
          when(mockPomeloRepo.getNobaConsumerIDHoldingPomeloCard("POMELO_CARD_ID", "POMELO_USER_ID")).thenResolve(
            nobaConsumerID,
          );
          when(mockCircleService.getOrCreateWallet("NOBA_CONSUMER_ID")).thenResolve(circleWalletID);
          when(mockCircleService.getWalletBalance("CIRCLE_WALLET_ID")).thenResolve(circleWalletBalance);
          when(mockTransactionService.initiateTransaction(anything())).thenResolve(debitTransaction);
          when(mockCircleService.debitWalletBalance("NOBA_TRANSACTION_ID", "CIRCLE_WALLET_ID", 50)).thenResolve({
            ...debitOrCreditWalletResponse,
            status: CircleTransferStatus.FAILURE,
          });
          when(
            mockPomeloRepo.updatePomeloTransactionStatus(
              "POMELO_TRANSACTION_ID",
              PomeloTransactionStatus.INSUFFICIENT_FUNDS,
            ),
          ).thenResolve();

          const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.adjustTransaction(
            debitRequest,
          );

          expect(response).toStrictEqual({
            detailedStatus: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
            summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "",
          });
        });
      });
    });
  });

  describe("signTransactionAuthorizationResponse", () => {
    it("should sign the request with '/transactions/authorization' endpoint", () => {
      const receivedSignature = pomeloTransactionService.signTransactionAuthorizationResponse(
        transactionAuthzValidTimestamp,
        getRawTransactionAuthzBodyBuffer(),
      );

      expect(receivedSignature).toBe(transactionAuthzValidSignature);
    });
  });

  describe("signTransactionAdjustmentResponse", () => {
    it("should sign the request with '/transactions/adjustments/credit' endpoint", () => {
      const receivedSignature = pomeloTransactionService.signTransactionAdjustmentResponse(
        transactionAdjustmentValidTimestamp,
        getRawTransactionAdjustmentBodyBuffer(),
        PomeloAdjustmentType.CREDIT,
      );

      expect(receivedSignature).toBe(transactionAdjustmentCreditValidSignature);
    });

    it("should sign the request with '/transactions/adjustments/debit' endpoint", () => {
      const receivedSignature = pomeloTransactionService.signTransactionAdjustmentResponse(
        transactionAdjustmentValidTimestamp,
        getRawTransactionAdjustmentBodyBuffer(),
        PomeloAdjustmentType.DEBIT,
      );

      expect(receivedSignature).toBe(transactionAdjustmentDebitValidSignature);
    });
  });
});
