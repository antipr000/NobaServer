import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { PomeloTransactionService } from "../pomelo.webhook.service";
import { PomeloTransactionWebhookController } from "../pomelo.webhook.controller";
import { PomeloWebhookMapper } from "../pomelo.webhook.mapper";
import { anyString, anything, capture, deepEqual, instance, when } from "ts-mockito";
import { getMockPomeloWebhookMapperWithDefaults } from "../mocks/mock.pomelo.webhook.mapper";
import { getMockPomeloTransactionServiceWithDefaults } from "../mocks/mock.pomelo.webhook.service";
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
  PomeloTransactionType,
} from "../../domain/PomeloTransaction";

describe("PomeloTransactionServiceTests", () => {
  jest.setTimeout(20000);

  let webhookController: PomeloTransactionWebhookController;
  let mockWebhookMapper: PomeloWebhookMapper;
  let mockPomeloTransactionService: PomeloTransactionService;

  let app: TestingModule;

  beforeEach(async () => {
    mockWebhookMapper = getMockPomeloWebhookMapperWithDefaults();
    mockPomeloTransactionService = getMockPomeloTransactionServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: PomeloWebhookMapper,
          useFactory: () => instance(mockWebhookMapper),
        },
        {
          provide: PomeloTransactionService,
          useFactory: () => instance(mockPomeloTransactionService),
        },
        PomeloTransactionWebhookController,
      ],
    }).compile();

    webhookController = app.get<PomeloTransactionWebhookController>(PomeloTransactionWebhookController);
  });

  afterEach(async () => {
    app.close();
  });

  describe("authorizeTransactions", () => {
    it("should properly map the input request, output response and attach signature to response", async () => {
      const parsedRequest: PomeloTransactionAuthzRequest = {
        endpoint: "ENDPOINT",
        rawBodyBuffer: Buffer.from("RAW_REQUEST_BODY"),
        timestamp: Date.now().toString(),
        rawSignature: "INPUT_SIGNATURE",
        idempotencyKey: "IDEMPOTENCY_KEY",

        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        transactionType: PomeloTransactionType.PURCHASE,
        pomeloCardID: "POMELO_CARD_ID",
        pomeloUserID: "POMELO_USER_ID",
        localAmount: 1111,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 11,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 1111,
        transactionCurrency: PomeloCurrency.COP,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        countryCode: "COL",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
      };
      when(mockWebhookMapper.convertToPomeloTransactionAuthzRequest(anything(), anything())).thenReturn(parsedRequest);

      const serviceResponse: PomeloTransactionAuthzResponse = {
        summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
        detailedStatus: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
        message: "MESSAGE",
      };
      when(mockPomeloTransactionService.authorizeTransaction(anything())).thenResolve(serviceResponse);
      when(mockPomeloTransactionService.signTransactionAuthorizationResponse(anyString(), anything())).thenReturn(
        "OUTPUT_SIGNATURE",
      );

      // *******************************************************
      // Mocking "RawBodyRequest<ExpressRequest>" structure
      //
      let jsonResult = {};
      let responseHeaders = {};
      const response = {
        set: headers => {
          responseHeaders = {
            ...responseHeaders,
            ...headers,
          };

          return {
            json: result => {
              jsonResult = {
                ...jsonResult,
                ...result,
              };
            },
          };
        },
      };
      // *******************************************************

      const expressRawRequest = {
        rawBody: Buffer.from("RAW_REQUEST"),
      };
      const requestBody = {
        field1: "value1",
        field2: "value2",
      };
      const headers = {
        header1: "value1",
        header2: "value2",
      };
      await webhookController.authorizeTransactions(expressRawRequest as any, response, requestBody, headers);

      expect(jsonResult).toStrictEqual({
        status: PomeloTransactionAuthzSummaryStatus.REJECTED,
        message: "MESSAGE",
        status_detail: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
      });
      expect(responseHeaders).toStrictEqual({
        "X-Endpoint": "/transactions/authorizations",
        "X-Timestamp": expect.any(String),
        "X-Signature": "OUTPUT_SIGNATURE",
      });

      const [inputBodyToCoversionRequest, inputHeaderToConversionRequest] = capture(
        mockWebhookMapper.convertToPomeloTransactionAuthzRequest,
      ).last();
      expect(inputBodyToCoversionRequest).toStrictEqual(requestBody);
      expect(inputHeaderToConversionRequest).toStrictEqual(headers);

      const [inputArgToAuthorizeTransaction] = capture(mockPomeloTransactionService.authorizeTransaction).last();
      expect(inputArgToAuthorizeTransaction).toStrictEqual({
        ...parsedRequest,
        rawBodyBuffer: expressRawRequest.rawBody,
      });

      const [inputTimestampToSignResponse, inputBufferBodyToSignResponse] = capture(
        mockPomeloTransactionService.signTransactionAuthorizationResponse,
      ).last();
      expect(inputTimestampToSignResponse).toBe(responseHeaders["X-Timestamp"]);
      expect(inputBufferBodyToSignResponse).toStrictEqual(
        Buffer.from(
          JSON.stringify({
            status: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "MESSAGE",
            status_detail: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
          }),
        ),
      );
    });
  });

  describe("adjustTransactions", () => {
    it("should properly map the input request, output response and attach signature to response", async () => {
      const parsedRequest: PomeloTransactionAdjustmentRequest = {
        endpoint: "ENDPOINT",
        rawBodyBuffer: Buffer.from("RAW_REQUEST_BODY"),
        unixTimestampSeconds: Date.now().toString(),
        rawSignature: "INPUT_SIGNATURE",
        idempotencyKey: "IDEMPOTENCY_KEY",

        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloOriginalTransactionID: "POMELO_ORIGINAL_TRANSACTION_ID",
        adjustmentType: PomeloAdjustmentType.CREDIT,
        transactionType: PomeloTransactionType.PURCHASE,
        pomeloCardID: "POMELO_CARD_ID",
        pomeloUserID: "POMELO_USER_ID",
        localAmount: 1111,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 11,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 1111,
        transactionCurrency: PomeloCurrency.COP,
        merchantName: "MERCHANT_NAME",
        merchantMCC: "MCC",
        countryCode: "COL",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
      };
      when(
        mockWebhookMapper.convertToPomeloTransactionAdjustmentRequest(
          anything(),
          anything(),
          PomeloAdjustmentType.CREDIT,
        ),
      ).thenReturn(parsedRequest);

      const serviceResponse: PomeloTransactionAuthzResponse = {
        summaryStatus: PomeloTransactionAuthzSummaryStatus.REJECTED,
        detailedStatus: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
        message: "MESSAGE",
      };
      when(mockPomeloTransactionService.adjustTransaction(anything())).thenResolve(serviceResponse);
      when(
        mockPomeloTransactionService.signTransactionAdjustmentResponse(
          anyString(),
          anything(),
          PomeloAdjustmentType.CREDIT,
        ),
      ).thenReturn("OUTPUT_SIGNATURE");

      // *******************************************************
      // Mocking "RawBodyRequest<ExpressRequest>" structure
      //
      let jsonResult = {};
      let responseHeaders = {};
      const response = {
        set: headers => {
          responseHeaders = {
            ...responseHeaders,
            ...headers,
          };

          return {
            json: result => {
              jsonResult = {
                ...jsonResult,
                ...result,
              };
            },
          };
        },
      };
      // *******************************************************

      const expressRawRequest = {
        rawBody: Buffer.from("RAW_REQUEST"),
      };
      const requestBody = {
        field1: "value1",
        field2: "value2",
      };
      const headers = {
        header1: "value1",
        header2: "value2",
      };
      await webhookController.adjustTransactions(expressRawRequest as any, response, requestBody, headers, "credit");

      expect(jsonResult).toStrictEqual({
        status: PomeloTransactionAuthzSummaryStatus.REJECTED,
        message: "MESSAGE",
        status_detail: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
      });
      expect(responseHeaders).toStrictEqual({
        "X-Endpoint": "/transactions/adjustments/credit",
        "X-Timestamp": expect.any(String),
        "X-Signature": "OUTPUT_SIGNATURE",
      });

      const [inputBodyToCoversionRequest, inputHeaderToConversionRequest, inputAdjustmentTypeToConverstionRequest] =
        capture(mockWebhookMapper.convertToPomeloTransactionAdjustmentRequest).last();
      expect(inputBodyToCoversionRequest).toStrictEqual(requestBody);
      expect(inputHeaderToConversionRequest).toStrictEqual(headers);
      expect(inputAdjustmentTypeToConverstionRequest).toBe("credit");

      const [inputArgToAuthorizeTransaction] = capture(mockPomeloTransactionService.adjustTransaction).last();
      expect(inputArgToAuthorizeTransaction).toStrictEqual({
        ...parsedRequest,
        rawBodyBuffer: expressRawRequest.rawBody,
      });

      const [inputTimestampToSignResponse, inputBufferBodyToSignResponse, inputAdjustmentTypeToSignResponse] = capture(
        mockPomeloTransactionService.signTransactionAdjustmentResponse,
      ).last();
      expect(inputTimestampToSignResponse).toBe(responseHeaders["X-Timestamp"]);
      expect(inputBufferBodyToSignResponse).toStrictEqual(
        Buffer.from(
          JSON.stringify({
            status: PomeloTransactionAuthzSummaryStatus.REJECTED,
            message: "MESSAGE",
            status_detail: PomeloTransactionAuthzDetailStatus.INSUFFICIENT_FUNDS,
          }),
        ),
      );
      expect(inputAdjustmentTypeToSignResponse).toBe("credit");
    });
  });
});
