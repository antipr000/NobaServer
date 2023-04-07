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
  PomeloTransactionAuthzDetailStatus,
  PomeloTransactionAuthzRequest,
  PomeloTransactionAuthzResponse,
  PomeloTransactionAuthzSummaryStatus,
  PomeloTransactionType,
} from "../../dto/pomelo.transaction.service.dto";
import { PomeloCurrency } from "../../domain/PomeloTransaction";

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
        pomeloOriginalTransactionID: null,
        pomeloCardID: "POMELO_CARD_ID",
        pomeloUserID: "POMELO_USER_ID",
        localAmount: 1111,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 11,
        settlementCurrency: PomeloCurrency.USD,
        merchantName: "MERCHANT_NAME",
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
        "X-signature": "OUTPUT_SIGNATURE",
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
});
