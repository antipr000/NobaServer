import { Test, TestingModule } from "@nestjs/testing";
import {
  POMELO_AFFINITY_GROUP,
  POMELO_CLIENT_ID,
  POMELO_CLIENT_SECRET,
  POMELO_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../../core/utils/WinstonModule";
import { PomeloTransactionService } from "../transaction/pomelo.transaction.service";
import {
  PomeloTransactionAuthzDetailStatus,
  PomeloTransactionAuthzRequest,
  PomeloTransactionAuthzResponse,
  PomeloTransactionAuthzSummaryStatus,
  PomeloTransactionType,
} from "../dto/pomelo.transaction.service.dto";
import { PomeloCurrency } from "../domain/PomeloTransaction";

const getRawBodyBuffer = (): Buffer => {
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
const validTimestamp = "1680024224";
const validSignature = "hmac-sha256 CwWJxPZFqLu2IxGvFxKepAPk6nhaFmJ1xzyH+khLvuo=";

describe("PomeloTransactionServiceTests", () => {
  jest.setTimeout(20000);

  let pomeloTransactionService: PomeloTransactionService;
  let app: TestingModule;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [POMELO_CONFIG_KEY]: {
        [POMELO_CLIENT_ID]: "POMELO_CLIENT_ID",
        [POMELO_CLIENT_SECRET]: "POMELO_CLIENT_SECRET",
        [POMELO_AFFINITY_GROUP]: "POMELO_AFFINITY_GROUP",
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PomeloTransactionService],
    }).compile();

    pomeloTransactionService = app.get<PomeloTransactionService>(PomeloTransactionService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("authorizeTransaction", () => {
    it("should reject the transaction with OTHER status if the 'endpoint' mismatched", async () => {
      const request: PomeloTransactionAuthzRequest = {
        endpoint: "/transactions/invalid-authorizations",
        rawBodyBuffer: getRawBodyBuffer(),
        rawSignature: validSignature,
        timestamp: validTimestamp,

        localAmount: 50,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 50,
        settlementCurrency: PomeloCurrency.COP,
        pomeloCardID: "POMELO_CARD_ID",
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloOriginalTransactionID: null,
        pomeloUserID: "POMELO_USER_ID",
        transactionType: PomeloTransactionType.PURCHASE,
      };

      const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

      expect(response).toStrictEqual({
        detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
        summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
        message: "",
      });
    });

    describe("should reject with OTHER status if 'signature' mismatched", () => {
      it("should return REJECTED if 'timestamp' differs by a few milliseconds", async () => {
        const request: PomeloTransactionAuthzRequest = {
          endpoint: "/transactions/authorizations",
          rawBodyBuffer: getRawBodyBuffer(),
          rawSignature: validSignature,
          timestamp: "1680024225",

          localAmount: 50,
          localCurrency: PomeloCurrency.COP,
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.COP,
          pomeloCardID: "POMELO_CARD_ID",
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          pomeloOriginalTransactionID: null,
          pomeloUserID: "POMELO_USER_ID",
          transactionType: PomeloTransactionType.PURCHASE,
        };

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("should return REJECTED if 'rawBodyBuffer' is not valid", async () => {
        const request: PomeloTransactionAuthzRequest = {
          endpoint: "/transactions/authorizations",
          rawBodyBuffer: Buffer.from("DUMMY_BODY", "utf8"),
          rawSignature: validSignature,
          timestamp: validTimestamp,

          localAmount: 50,
          localCurrency: PomeloCurrency.COP,
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.COP,
          pomeloCardID: "POMELO_CARD_ID",
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          pomeloOriginalTransactionID: null,
          pomeloUserID: "POMELO_USER_ID",
          transactionType: PomeloTransactionType.PURCHASE,
        };

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });

      it("should return REJECTED if 'signature' is not valid", async () => {
        const request: PomeloTransactionAuthzRequest = {
          endpoint: "/transactions/authorizations",
          rawBodyBuffer: getRawBodyBuffer(),
          rawSignature: "INVALID_SIGNATURE",
          timestamp: validTimestamp,

          localAmount: 50,
          localCurrency: PomeloCurrency.COP,
          settlementAmount: 50,
          settlementCurrency: PomeloCurrency.COP,
          pomeloCardID: "POMELO_CARD_ID",
          pomeloTransactionID: "POMELO_TRANSACTION_ID",
          pomeloOriginalTransactionID: null,
          pomeloUserID: "POMELO_USER_ID",
          transactionType: PomeloTransactionType.PURCHASE,
        };

        const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

        expect(response).toStrictEqual({
          detailedStatus: PomeloTransactionAuthzDetailStatus.OTHER,
          summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
          message: "",
        });
      });
    });

    it("should appove the transaction with a valid response signature, if the signature is correct", async () => {
      const request: PomeloTransactionAuthzRequest = {
        endpoint: "/transactions/authorizations",
        rawBodyBuffer: getRawBodyBuffer(),
        rawSignature: validSignature,
        timestamp: validTimestamp,

        localAmount: 50,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 50,
        settlementCurrency: PomeloCurrency.COP,
        pomeloCardID: "POMELO_CARD_ID",
        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloOriginalTransactionID: null,
        pomeloUserID: "POMELO_USER_ID",
        transactionType: PomeloTransactionType.PURCHASE,
      };

      const response: PomeloTransactionAuthzResponse = await pomeloTransactionService.authorizeTransaction(request);

      expect(response).toStrictEqual({
        detailedStatus: PomeloTransactionAuthzDetailStatus.APPROVED,
        summaryStatus: PomeloTransactionAuthzSummaryStatus.APPROVED,
        message: "",
      });
    });
  });

  describe("signTransactionAuthorizationResponse", () => {
    it("should sign the request with '/transactions/authorization' endpoint", () => {
      const receivedSignature = pomeloTransactionService.signTransactionAuthorizationResponse(
        validTimestamp,
        getRawBodyBuffer(),
      );

      expect(receivedSignature).toBe(validSignature);
    });
  });
});
