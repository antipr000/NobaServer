import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import {
  PomeloCurrency,
  PomeloEntryMode,
  PomeloOrigin,
  PomeloPointType,
  PomeloSource,
  PomeloTransactionType,
} from "../../domain/PomeloTransaction";
import {
  PomeloAdjustmentType,
  PomeloTransactionAdjustmentRequest,
  PomeloTransactionAuthzRequest,
} from "../../dto/pomelo.transaction.service.dto";
import { PomeloWebhookMapper } from "../pomelo.webhook.mapper";
import { AlertService } from "../../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../../modules/common/mocks/mock.alert.service";
import { instance } from "ts-mockito";

describe("PomeloWebhookMapperService", () => {
  jest.setTimeout(20000);

  let pomeloWebhookMapper: PomeloWebhookMapper;
  let app: TestingModule;
  let mockAlertService: AlertService;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    mockAlertService = getMockAlertServiceWithDefaults();
    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        PomeloWebhookMapper,
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
        },
      ],
    }).compile();

    pomeloWebhookMapper = app.get<PomeloWebhookMapper>(PomeloWebhookMapper);
  });

  afterEach(async () => {
    app.close();
  });

  describe("convertToPomeloTransactionAuthzRequest", () => {
    describe("error scenarios", () => {
      const validMinimalRequestBody = {
        transaction: {
          id: "POMELO_TRANSACTION_ID",
          type: "PURCHASE",
          point_type: "POS",
          entry_mode: "MANUAL",
          country_code: "COL",
          origin: "DOMESTIC",
          source: "ONLINE",
        },
        merchant: {
          name: "MERCHANT_NAME",
          mcc: "MCC",
        },
        card: {
          id: "POMELO_CARD_ID",
        },
        user: {
          id: "POMELO_USER_ID",
        },
        amount: {
          local: {
            total: 1111,
            currency: "COP",
          },
          transaction: {
            total: 111,
            currency: "COP",
          },
          settlement: {
            total: 11,
            currency: "USD",
          },
        },
      };
      const validMinimalHeaders = {
        "x-endpoint": "ENDPOINT",
        "x-timestamp": "999999999",
        "x-signature": "SIGNATURE",
        "x-idempotency-key": "IDEMPOTENCY_KEY",
      };

      describe("missing/invalid fields 'requestBody'", () => {
        describe("transaction sub-object", () => {
          it("should throw error when 'transaction' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.transaction;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("transaction"));
            }
          });

          const errorOnMissingFields = ["id", "type", "country_code", "entry_mode", "point_type", "origin", "source"];
          it.each(errorOnMissingFields)(
            "should throw error when 'transaction' object's '%s' field is missing",
            field => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.transaction[field];

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining(`${field}`));
              }
            },
          );

          const invalidTypeFields = [
            PomeloTransactionType.REVERSAL_REFUND,
            PomeloTransactionType.REVERSAL_PAYMENT,
            PomeloTransactionType.REFUND,
            PomeloTransactionType.PAYMENT,
            PomeloTransactionType.REVERSAL_PURCHASE,
            PomeloTransactionType.REVERSAL_WITHDRAWAL,
            PomeloTransactionType.REVERSAL_EXTRACASH,
            "INVALID",
          ];
          it.each(invalidTypeFields)(
            "should throw error when 'transaction' object's 'type' field is '%s'",
            invalidTypeField => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.transaction.type = invalidTypeField as any;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("type"));
              }
            },
          );

          const enumFieldsToTestForInvalidValues = ["entry_mode", "point_type", "origin", "source"];
          it.each(enumFieldsToTestForInvalidValues)(
            "should throw error when 'transaction' object's '%s' field has INVALID value",
            field => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.transaction[field] = "INVALID_VALUE";

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining(`${field}`));
              }
            },
          );
        });

        describe("card sub-object", () => {
          it("should throw error when 'card' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.card;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("card"));
            }
          });

          it("should throw error when 'card' object's 'id' field is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.card.id;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("card"));
              expect(err.message).toEqual(expect.stringContaining("id"));
            }
          });
        });

        describe("user sub-object", () => {
          it("should throw error when 'user' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.user;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("user"));
            }
          });

          it("should throw error when 'user' object's 'id' field is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.user.id;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("user"));
              expect(err.message).toEqual(expect.stringContaining("id"));
            }
          });
        });

        describe("merchant sub-object", () => {
          it("should throw error when 'merchant' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.merchant;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("merchant"));
            }
          });

          it("should throw error when 'merchant' object's 'name' field is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.merchant.name;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("merchant"));
              expect(err.message).toEqual(expect.stringContaining("name"));
            }
          });

          it("should throw error when 'merchant' object's 'mcc' field is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.merchant.mcc;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("merchant"));
              expect(err.message).toEqual(expect.stringContaining("mcc"));
            }
          });
        });

        describe("'amount' sub-object", () => {
          it("should throw error when 'amount' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.amount;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("amount"));
            }
          });

          describe("'local' amount", () => {
            it("should throw error when 'amount' object's 'local' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.local;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
              }
            });

            it("should throw error when 'amount.local' object's 'total' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.local.total;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.local' object's 'total' field is negative", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.local.total = -123;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.local' object's 'total' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.local.total = "s";

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.local' object's 'currency' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.local.currency;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });

            it("should throw error when 'amount.local' object's 'currency' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.local.currency = "INVALID";

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });
          });

          describe("'transaction' amount", () => {
            it("should throw error when 'amount' object's 'transaction' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.transaction;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'total' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.transaction.total;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'total' field is negative", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.transaction.total = -123;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'total' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.transaction.total = "s";

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'currency' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.transaction.currency;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'currency' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.transaction.currency = "INVALID";

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });
          });

          describe("'settlement' amount", () => {
            it("should throw error when 'amount' object's 'settlement' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.settlement;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'total' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.settlement.total;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'total' field is negative", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.settlement.total = -123;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'total' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.settlement.total = "INVALID";

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'currency' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.settlement.currency;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'currency' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.settlement.currency = "INVALID";

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });
          });
        });
      });

      describe("missing/invalid fields 'headers'", () => {
        it("should throw error when 'x-endpoint' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          delete headers["x-endpoint"];

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("x-endpoint"));
          }
        });

        it("should throw error when 'x-timestamp' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          delete headers["x-timestamp"];

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("x-timestamp"));
          }
        });

        it("should throw error when 'x-signature' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          delete headers["x-signature"];

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("x-signature"));
          }
        });

        it("should throw error when 'x-idempotency-key' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          delete headers["x-idempotency-key"];

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(requestBody, headers);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("x-idempotency-key"));
          }
        });
      });
    });

    it("should map all the parameters correctly to 'PomeloTransactionAuthzRequest'", () => {
      const requestBody = {
        transaction: {
          id: "POMELO_TRANSACTION_ID",
          country_code: "ESP",
          type: "PURCHASE",
          point_type: "ECOMMERCE",
          entry_mode: "MANUAL",
          origin: "INTERNATIONAL",
          source: "ONLINE",
          local_date_time: "2019-08-24T14:15:22",
          original_transaction_id: null,
        },
        merchant: {
          id: "5555555555555555",
          mcc: "5555",
          address: null,
          name: "Noba Technologies",
        },
        card: {
          id: "POMELO_CARD_ID",
          product_type: "PREPAID",
          provider: "MASTERCARD",
          last_four: "1234",
        },
        user: {
          id: "POMELO_USER_ID",
        },
        amount: {
          local: {
            total: 1111,
            currency: "COP",
          },
          transaction: {
            total: 111,
            currency: "COP",
          },
          settlement: {
            total: 11,
            currency: "USD",
          },
          details: [
            {
              type: "BASE",
              currency: "ARS",
              amount: 999.9,
              name: "BASE",
            },
          ],
        },
      };
      const headers = {
        "x-endpoint": "ENDPOINT",
        "x-timestamp": "999999999",
        "x-signature": "SIGNATURE",
        "x-idempotency-key": "IDEMPOTENCY_KEY",
      };

      const response: PomeloTransactionAuthzRequest = pomeloWebhookMapper.convertToPomeloTransactionAuthzRequest(
        requestBody,
        headers,
      );

      expect(response).toStrictEqual({
        endpoint: "ENDPOINT",
        unixTimestampSeconds: "999999999",
        rawSignature: "SIGNATURE",
        rawBodyBuffer: null,
        idempotencyKey: "IDEMPOTENCY_KEY",

        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        transactionType: PomeloTransactionType.PURCHASE,
        merchantName: "Noba Technologies",
        merchantMCC: "5555",
        pomeloCardID: "POMELO_CARD_ID",
        pomeloUserID: "POMELO_USER_ID",
        localAmount: 1111,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 11,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 111,
        transactionCurrency: PomeloCurrency.COP,
        countryCode: "ESP",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
      });
    });
  });

  describe("convertToPomeloTransactionAdjustmentRequest", () => {
    describe("error scenarios", () => {
      const validAdjustmentType = PomeloAdjustmentType.CREDIT;
      const validMinimalRequestBody = {
        transaction: {
          id: "POMELO_TRANSACTION_ID",
          type: "REVERSAL_WITHDRAWAL",
          original_transaction_id: "ORIGINAL_TRANSACTION_ID",
          point_type: "POS",
          entry_mode: "MANUAL",
          country_code: "COL",
          origin: "DOMESTIC",
          source: "ONLINE",
        },
        merchant: {
          name: "MERCHANT_NAME",
          mcc: "MCC",
        },
        card: {
          id: "POMELO_CARD_ID",
        },
        user: {
          id: "POMELO_USER_ID",
        },
        amount: {
          local: {
            total: 1111,
            currency: "COP",
          },
          transaction: {
            total: 111,
            currency: "COP",
          },
          settlement: {
            total: 11,
            currency: "USD",
          },
        },
      };
      const validMinimalHeaders = {
        "x-endpoint": "ENDPOINT",
        "x-timestamp": "999999999",
        "x-signature": "SIGNATURE",
        "x-idempotency-key": "IDEMPOTENCY_KEY",
      };

      describe("missing/invalid fields 'requestBody'", () => {
        describe("transaction sub-object", () => {
          it("should throw error when 'transaction' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.transaction;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("transaction"));
            }
          });

          const errorOnMissingFields = [
            "id",
            "type",
            "original_transaction_id",
            "country_code",
            "entry_mode",
            "point_type",
            "origin",
            "source",
          ];
          it.each(errorOnMissingFields)(
            "should throw error when 'transaction' object's '%s' field is missing",
            field => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.transaction[field];
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining(`${field}`));
              }
            },
          );

          const enumFieldsToTestForInvalidValues = ["entry_mode", "point_type", "origin", "source"];
          it.each(enumFieldsToTestForInvalidValues)(
            "should throw error when 'transaction' object's '%s' field has INVALID value",
            field => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.transaction[field] = "INVALID_VALUE";
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining(`${field}`));
              }
            },
          );

          const invalidTypeFieldsForCredit = [
            PomeloTransactionType.PURCHASE,
            PomeloTransactionType.WITHDRAWAL,
            PomeloTransactionType.EXTRACASH,
            PomeloTransactionType.REVERSAL_REFUND,
            PomeloTransactionType.REVERSAL_PAYMENT,
            "INVALID",
          ];
          it.each(invalidTypeFieldsForCredit)(
            "'credit' adjustment: should throw error when 'transaction' object's 'type' field is '%s'",
            invalidTypeField => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.transaction.type = invalidTypeField as any;
              const adjustmentType = PomeloAdjustmentType.CREDIT;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("type"));
              }
            },
          );

          const invalidTypeFieldsForDebit = [
            PomeloTransactionType.REFUND,
            PomeloTransactionType.PAYMENT,
            PomeloTransactionType.REVERSAL_PURCHASE,
            PomeloTransactionType.REVERSAL_WITHDRAWAL,
            PomeloTransactionType.REVERSAL_EXTRACASH,
            "INVALID",
          ];
          it.each(invalidTypeFieldsForDebit)(
            "'debit' adjustment: should throw error when 'transaction' object's 'type' field is '%s'",
            invalidTypeField => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.transaction.type = invalidTypeField as any;
              const adjustmentType = PomeloAdjustmentType.DEBIT;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("type"));
              }
            },
          );
        });

        describe("card sub-object", () => {
          it("should throw error when 'card' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.card;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("card"));
            }
          });

          it("should throw error when 'card' object's 'id' field is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.card.id;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("card"));
              expect(err.message).toEqual(expect.stringContaining("id"));
            }
          });
        });

        describe("user sub-object", () => {
          it("should throw error when 'user' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.user;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("user"));
            }
          });

          it("should throw error when 'user' object's 'id' field is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.user.id;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("user"));
              expect(err.message).toEqual(expect.stringContaining("id"));
            }
          });
        });

        describe("merchant sub-object", () => {
          it("should throw error when 'merchant' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.merchant;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("merchant"));
            }
          });

          it("should throw error when 'merchant' object's 'name' field is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.merchant.name;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("merchant"));
              expect(err.message).toEqual(expect.stringContaining("name"));
            }
          });

          it("should throw error when 'merchant' object's 'mcc' field is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.merchant.mcc;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("merchant"));
              expect(err.message).toEqual(expect.stringContaining("mcc"));
            }
          });
        });

        describe("'amount' sub-object", () => {
          it("should throw error when 'amount' object is missing", () => {
            const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
            const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
            delete requestBody.amount;
            const adjustmentType = validAdjustmentType;

            try {
              pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
              expect(true).toBe(false);
            } catch (err) {
              expect(err).toBeInstanceOf(ServiceException);
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("amount"));
            }
          });

          describe("'local' amount", () => {
            it("should throw error when 'amount' object's 'local' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.local;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
              }
            });

            it("should throw error when 'amount.local' object's 'total' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.local.total;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.local' object's 'total' field is negative", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.local.total = -123;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.local' object's 'total' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.local.total = "s";
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.local' object's 'currency' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.local.currency;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });

            it("should throw error when 'amount.local' object's 'currency' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.local.currency = "INVALID";
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("local"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });
          });

          describe("'transaction' amount", () => {
            it("should throw error when 'amount' object's 'transaction' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.transaction;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'total' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.transaction.total;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'total' field is negative", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.transaction.total = -123;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'total' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.transaction.total = "s";
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'currency' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.transaction.currency;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });

            it("should throw error when 'amount.transaction' object's 'currency' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.transaction.currency = "INVALID";
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("transaction"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });
          });

          describe("'settlement' amount", () => {
            it("should throw error when 'amount' object's 'settlement' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.settlement;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'total' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.settlement.total;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'total' field is negative", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.settlement.total = -123;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'total' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.settlement.total = "INVALID";
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("total"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'currency' field is missing", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              delete requestBody.amount.settlement.currency;
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });

            it("should throw error when 'amount.settlement' object's 'currency' field is invalid", () => {
              const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
              const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
              requestBody.amount.settlement.currency = "INVALID";
              const adjustmentType = validAdjustmentType;

              try {
                pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
                expect(true).toBe(false);
              } catch (err) {
                expect(err).toBeInstanceOf(ServiceException);
                expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
                expect(err.message).toEqual(expect.stringContaining("amount"));
                expect(err.message).toEqual(expect.stringContaining("settlement"));
                expect(err.message).toEqual(expect.stringContaining("currency"));
              }
            });
          });
        });
      });

      describe("missing/invalid fields 'headers'", () => {
        it("should throw error when 'x-endpoint' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          delete headers["x-endpoint"];
          const adjustmentType = validAdjustmentType;

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("x-endpoint"));
          }
        });

        it("should throw error when 'x-timestamp' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          delete headers["x-timestamp"];
          const adjustmentType = validAdjustmentType;

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("x-timestamp"));
          }
        });

        it("should throw error when 'x-signature' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          delete headers["x-signature"];
          const adjustmentType = validAdjustmentType;

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("x-signature"));
          }
        });

        it("should throw error when 'x-idempotency-key' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          delete headers["x-idempotency-key"];
          const adjustmentType = validAdjustmentType;

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("x-idempotency-key"));
          }
        });
      });

      describe("'adjustmentType' validations", () => {
        it("should throw error when 'adjustmentType' field is missing", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          const adjustmentType = null;

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("adjustmentType"));
          }
        });

        it("should throw error when 'adjustmentType' field is invalid", () => {
          const requestBody = JSON.parse(JSON.stringify(validMinimalRequestBody));
          const headers = JSON.parse(JSON.stringify(validMinimalHeaders));
          const adjustmentType = "INVALID";

          try {
            pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(requestBody, headers, adjustmentType);
            expect(true).toBe(false);
          } catch (err) {
            expect(err).toBeInstanceOf(ServiceException);
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining("adjustmentType"));
          }
        });
      });
    });

    it("should map all the parameters correctly to 'PomeloTransactionAdjustmentRequest'", () => {
      const requestBody = {
        transaction: {
          id: "POMELO_TRANSACTION_ID",
          country_code: "ESP",
          type: "REVERSAL_PURCHASE",
          point_type: "ECOMMERCE",
          entry_mode: "MANUAL",
          origin: "INTERNATIONAL",
          source: "ONLINE",
          local_date_time: "2019-08-24T14:15:22",
          original_transaction_id: "POMELO_ORIGINAL_TRANSACTION_ID",
        },
        merchant: {
          id: "5555555555555555",
          mcc: "5555",
          address: null,
          name: "Noba Technologies",
        },
        card: {
          id: "POMELO_CARD_ID",
          product_type: "PREPAID",
          provider: "MASTERCARD",
          last_four: "1234",
        },
        user: {
          id: "POMELO_USER_ID",
        },
        amount: {
          local: {
            total: 1111,
            currency: "COP",
          },
          transaction: {
            total: 111,
            currency: "COP",
          },
          settlement: {
            total: 11,
            currency: "USD",
          },
          details: [
            {
              type: "BASE",
              currency: "ARS",
              amount: 999.9,
              name: "BASE",
            },
          ],
        },
      };
      const headers = {
        "x-endpoint": "ENDPOINT",
        "x-timestamp": "999999999",
        "x-signature": "SIGNATURE",
        "x-idempotency-key": "IDEMPOTENCY_KEY",
      };

      const response: PomeloTransactionAdjustmentRequest =
        pomeloWebhookMapper.convertToPomeloTransactionAdjustmentRequest(
          requestBody,
          headers,
          PomeloAdjustmentType.CREDIT,
        );

      expect(response).toStrictEqual({
        endpoint: "ENDPOINT",
        unixTimestampSeconds: "999999999",
        rawSignature: "SIGNATURE",
        rawBodyBuffer: null,
        idempotencyKey: "IDEMPOTENCY_KEY",

        pomeloTransactionID: "POMELO_TRANSACTION_ID",
        pomeloOriginalTransactionID: "POMELO_ORIGINAL_TRANSACTION_ID",
        adjustmentType: PomeloAdjustmentType.CREDIT,
        transactionType: PomeloTransactionType.REVERSAL_PURCHASE,
        merchantName: "Noba Technologies",
        merchantMCC: "5555",
        pomeloCardID: "POMELO_CARD_ID",
        pomeloUserID: "POMELO_USER_ID",
        localAmount: 1111,
        localCurrency: PomeloCurrency.COP,
        settlementAmount: 11,
        settlementCurrency: PomeloCurrency.USD,
        transactionAmount: 111,
        transactionCurrency: PomeloCurrency.COP,
        countryCode: "ESP",
        entryMode: PomeloEntryMode.MANUAL,
        pointType: PomeloPointType.ECOMMERCE,
        origin: PomeloOrigin.INTERNATIONAL,
        source: PomeloSource.ONLINE,
      });
    });
  });
});
