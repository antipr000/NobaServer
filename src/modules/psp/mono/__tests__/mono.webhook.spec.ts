import { Test, TestingModule } from "@nestjs/testing";
import {
  MONO_BASE_URL,
  MONO_BEARER_TOKEN,
  MONO_CONFIG_KEY,
  MONO_WEBHOOK_SECRET,
  SERVER_LOG_FILE_PATH,
} from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { MonoWebhookHandlers } from "../mono.webhook";
import { InternalServiceErrorException } from "../../../../core/exception/CommonAppException";
import { createHmac } from "crypto";
import { MonoCurrency, MonoTransactionState } from "../../domain/Mono";
import { ServiceException } from "../../../../core/exception/service.exception";

const webhookSecret = "whsec_LVeQsJFZ9MxlmUZLkpZ8lGLmuCaGuySk";

const createMonoSignature = (webhookResponse: any, evenntTimestamp: number) => {
  const payload = `${evenntTimestamp}.${JSON.stringify(webhookResponse)}`;
  return createHmac("sha256", webhookSecret).update(payload).digest("hex");
};

describe("MonoWebhookHandlersTest", () => {
  jest.setTimeout(20000);

  let monoWebhookHandlers: MonoWebhookHandlers;
  let app: TestingModule;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [MONO_CONFIG_KEY]: {
        [MONO_WEBHOOK_SECRET]: webhookSecret,
        [MONO_BASE_URL]: "https://mono.noba.com",
        [MONO_BEARER_TOKEN]: "DUMMY_BEARER_TOKEN",
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [MonoWebhookHandlers],
    }).compile();

    monoWebhookHandlers = app.get<MonoWebhookHandlers>(MonoWebhookHandlers);
  });

  afterEach(async () => {
    app.close();
  });

  describe("convertCollectionLinkCredited ()", () => {
    const webhookResponseValidSignature =
      "t=1673530807,v1=d4121af715c05341d900ca27bee7016cf2250741b21d9312ca9b39774f9f6ea0";
    const webhookEventTime = 1673530807;

    const collectionLinkCreditedWebhookResponse = {
      event: {
        data: {
          account_id: "acc_223RxfTSugBz8KfLSWoEnT",
          amount: {
            amount: 11110000,
            currency: "COP",
          },
          collection_link_id: "clink_70sjVsmvrCGIiG4q8SixH7",
          id: "cint_0zjnLPecrjC4dTopVY1LrD",
          inserted_at: "2023-01-12T13:35:48.392215Z",
          note: "string",
          payer: {
            document_number: "string",
            document_type: "CC",
            name: "Subham Agarwal",
          },
          payment: {
            provider: "pse",
            transaction_id: "3062160",
          },
          reference: "string",
          state: "account_credited",
          updated_at: "2023-01-12T13:39:57.848597Z",
        },
        type: "collection_intent_credited",
      },
      timestamp: "2023-01-12T13:40:07.555706Z",
    };

    it("should throw InternalServiceErrorException if the signature is not valid (timestamp is different)", () => {
      const webhookResponseInvalidSignature = `t=${Date.now()},v1=${webhookResponseValidSignature}`;
      expect(() =>
        monoWebhookHandlers.convertCollectionLinkCredited(
          collectionLinkCreditedWebhookResponse,
          webhookResponseInvalidSignature,
        ),
      ).toThrowError(InternalServiceErrorException);
    });

    it("should throw InternalServiceErrorException if the signature is not valid (signature is different)", () => {
      const webhookResponseInvalidSignature = `t=${webhookEventTime},v1=${uuid()}`;
      expect(() =>
        monoWebhookHandlers.convertCollectionLinkCredited(
          collectionLinkCreditedWebhookResponse,
          webhookResponseInvalidSignature,
        ),
      ).toThrowError(InternalServiceErrorException);
    });

    it("should throw InternalServiceErrorException if the signature is not valid (rawBody is different)", () => {
      const anotherWebhookEvent = {
        event: {
          data: collectionLinkCreditedWebhookResponse.event.data,
          type: "bank_transfer_approved",
        },
        timestamp: collectionLinkCreditedWebhookResponse.timestamp,
      };
      expect(() =>
        monoWebhookHandlers.convertCollectionLinkCredited(anotherWebhookEvent, webhookResponseValidSignature),
      ).toThrowError(InternalServiceErrorException);
    });

    it("should throw InternalServiceErrorException if the state is not 'account_credited'", () => {
      const webhookEvent = {
        event: {
          data: collectionLinkCreditedWebhookResponse.event.data,
          type: "bank_transfer_approved",
        },
        timestamp: collectionLinkCreditedWebhookResponse.timestamp,
      };
      const webhookResponseSignature = `t=${webhookEventTime},v1=${createMonoSignature(
        webhookEvent,
        webhookEventTime,
      )}`;

      expect(() =>
        monoWebhookHandlers.convertCollectionLinkCredited(webhookEvent, webhookResponseSignature),
      ).toThrowError(InternalServiceErrorException);
      expect(() =>
        monoWebhookHandlers.convertCollectionLinkCredited(webhookEvent, webhookResponseSignature),
      ).toThrowError("Invalid 'collection_intent_credited' webhook response.");
    });

    it("should map all the fields from the request to CollectionIntentCreditedEvent", () => {
      expect(
        monoWebhookHandlers.convertCollectionLinkCredited(
          collectionLinkCreditedWebhookResponse,
          webhookResponseValidSignature,
        ),
      ).toEqual({
        accountID: "acc_223RxfTSugBz8KfLSWoEnT",
        amount: 11110000,
        currency: "COP",
        collectionLinkID: "clink_70sjVsmvrCGIiG4q8SixH7",
        monoTransactionID: "3062160",
      });
    });
  });

  describe("convertBankTransferApproved ()", () => {
    const webhookResponseValidSignature =
      "t=1673530807,v1=d4121af715c05341d900ca27bee7016cf2250741b21d9312ca9b39774f9f6ea0";
    const webhookEventTime = 1673530807;

    const bankTransferApprovedWebhookEvent = {
      event: {
        data: {
          amount: {
            amount: 1600000,
            currency: "COP",
          },
          batch: {
            account_id: "acc_16ktUqSO7G0qTHDz8I3qrG",
            id: "bat_2DpSchlriwoCuyGMOoIuwp",
            inserted_at: "2022-12-28T16:19:52.471575Z",
            origin: "api",
            state: "declined",
            total_amount: {
              amount: 1600000,
              currency: "COP",
            },
            updated_at: "2022-12-28T16:40:06.822840Z",
          },
          declination_reason: null,
          description: "some description",
          entity_id: "123456789",
          id: "trn_2PVWOx9dZKJMBZw7opjrrs",
          inserted_at: "2022-12-28T16:19:52.530158Z",
          payee: {
            bank_account: {
              bank_code: "007",
              number: "000000009",
              type: "savings_account",
            },
            document_number: "1033711400",
            document_type: "CC",
            email: "someone@gmail.com",
            name: "patricio rothschild",
          },
          reference: "ref # 1231",
          state: "approved",
          updated_at: "2022-12-28T16:40:06.812742Z",
        },
        type: "bank_transfer_approved",
      },
      timestamp: "2022-12-28T16:54:38.660650Z",
    };

    it("should throw InternalServiceErrorException if the signature is not valid (timestamp is different)", () => {
      const webhookResponseInvalidSignature = `t=${Date.now()},v1=${createMonoSignature(
        bankTransferApprovedWebhookEvent,
        webhookEventTime,
      )}`;

      try {
        monoWebhookHandlers.convertBankTransferApproved(
          bankTransferApprovedWebhookEvent,
          webhookResponseInvalidSignature,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid Mono signature");
      }
    });

    it("should throw InternalServiceErrorException if the signature is not valid (signature is different)", () => {
      const webhookResponseInvalidSignature = `t=${webhookEventTime},v1=${uuid()}`;

      try {
        monoWebhookHandlers.convertBankTransferApproved(
          bankTransferApprovedWebhookEvent,
          webhookResponseInvalidSignature,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid Mono signature");
      }
    });

    it("should throw InternalServiceErrorException if the signature is not valid (rawBody is different)", () => {
      const anotherWebhookEvent = {
        event: {
          data: bankTransferApprovedWebhookEvent.event.data,
          type: "bank_transfer_approved",
        },
        timestamp: bankTransferApprovedWebhookEvent.timestamp,
      };

      try {
        monoWebhookHandlers.convertBankTransferApproved(anotherWebhookEvent, webhookResponseValidSignature);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid Mono signature");
      }
    });

    it("should throw InternalServiceErrorException if the type is not 'bank_transfer_approved'", () => {
      const webhookEvent = {
        event: {
          data: bankTransferApprovedWebhookEvent.event.data,
          type: "bank_transfer_rejected",
        },
        timestamp: bankTransferApprovedWebhookEvent.timestamp,
      };
      const webhookResponseSignature = `t=${webhookEventTime},v1=${createMonoSignature(
        webhookEvent,
        webhookEventTime,
      )}`;

      try {
        monoWebhookHandlers.convertBankTransferApproved(webhookEvent, webhookResponseSignature);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid 'bank_transfer_approved' webhook response.");
      }
    });

    it("should throw InternalServiceErrorException if the state is not 'approved'", () => {
      const webhookEvent = {
        event: {
          data: {
            ...bankTransferApprovedWebhookEvent.event.data,
            state: "declined",
          },
          type: "bank_transfer_approved",
        },
        timestamp: bankTransferApprovedWebhookEvent.timestamp,
      };
      const webhookResponseSignature = `t=${webhookEventTime},v1=${createMonoSignature(
        webhookEvent,
        webhookEventTime,
      )}`;

      try {
        monoWebhookHandlers.convertBankTransferApproved(webhookEvent, webhookResponseSignature);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid 'bank_transfer_approved' webhook response.");
      }
    });

    it("should map all the fields from the request to BankTransferApprovedEvent", () => {
      const webhookResponseSignature = `t=${webhookEventTime},v1=${createMonoSignature(
        bankTransferApprovedWebhookEvent,
        webhookEventTime,
      )}`;

      expect(
        monoWebhookHandlers.convertBankTransferApproved(bankTransferApprovedWebhookEvent, webhookResponseSignature),
      ).toEqual({
        accountID: "acc_16ktUqSO7G0qTHDz8I3qrG",
        amount: 1600000,
        currency: "COP",
        batchID: "bat_2DpSchlriwoCuyGMOoIuwp",
        transferID: "trn_2PVWOx9dZKJMBZw7opjrrs",
      });
    });
  });

  describe("convertBankTransferRejected ()", () => {
    const webhookResponseValidSignature =
      "t=1673530807,v1=d4121af715c05341d900ca27bee7016cf2250741b21d9312ca9b39774f9f6ea0";
    const webhookEventTime = 1673530807;

    const bankTransferRejectedWebhookEvent = {
      event: {
        data: {
          amount: {
            amount: 1600000,
            currency: "COP",
          },
          batch: {
            account_id: "acc_16ktUqSO7G0qTHDz8I3qrG",
            id: "bat_2DpSchlriwoCuyGMOoIuwp",
            inserted_at: "2022-12-28T16:19:52.471575Z",
            origin: "api",
            state: "declined",
            total_amount: {
              amount: 1600000,
              currency: "COP",
            },
            updated_at: "2022-12-28T16:40:06.822840Z",
          },
          declination_reason: "Transaction cancelled by the user",
          description: "some description",
          entity_id: "123456789",
          id: "trn_2PVWOx9dZKJMBZw7opjrrs",
          inserted_at: "2022-12-28T16:19:52.530158Z",
          payee: {
            bank_account: {
              bank_code: "007",
              number: "000000009",
              type: "savings_account",
            },
            document_number: "1033711400",
            document_type: "CC",
            email: "someone@gmail.com",
            name: "patricio rothschild",
          },
          reference: "ref # 1231",
          state: "cancelled",
          updated_at: "2022-12-28T16:40:06.812742Z",
        },
        type: "bank_transfer_rejected",
      },
      timestamp: "2022-12-28T16:54:38.660650Z",
    };

    it("should throw InternalServiceErrorException if the signature is not valid (timestamp is different)", () => {
      const webhookResponseInvalidSignature = `t=${Date.now()},v1=${createMonoSignature(
        bankTransferRejectedWebhookEvent,
        webhookEventTime,
      )}`;

      try {
        monoWebhookHandlers.convertBankTransferRejected(
          bankTransferRejectedWebhookEvent,
          webhookResponseInvalidSignature,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid Mono signature");
      }
    });

    it("should throw InternalServiceErrorException if the signature is not valid (signature is different)", () => {
      const webhookResponseInvalidSignature = `t=${webhookEventTime},v1=${uuid()}`;

      try {
        monoWebhookHandlers.convertBankTransferRejected(
          bankTransferRejectedWebhookEvent,
          webhookResponseInvalidSignature,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid Mono signature");
      }
    });

    it("should throw InternalServiceErrorException if the signature is not valid (rawBody is different)", () => {
      const anotherWebhookEvent = {
        event: {
          data: bankTransferRejectedWebhookEvent.event.data,
          type: "bank_transfer_rejected",
        },
        timestamp: bankTransferRejectedWebhookEvent.timestamp,
      };

      try {
        monoWebhookHandlers.convertBankTransferRejected(anotherWebhookEvent, webhookResponseValidSignature);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid Mono signature");
      }
    });

    it("should throw InternalServiceErrorException if the type is not 'bank_transfer_rejected'", () => {
      const webhookEvent = {
        event: {
          data: bankTransferRejectedWebhookEvent.event.data,
          type: "bank_transfer_approved",
        },
        timestamp: bankTransferRejectedWebhookEvent.timestamp,
      };
      const webhookResponseSignature = `t=${webhookEventTime},v1=${createMonoSignature(
        webhookEvent,
        webhookEventTime,
      )}`;

      try {
        monoWebhookHandlers.convertBankTransferRejected(webhookEvent, webhookResponseSignature);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid 'bank_transfer_rejected' webhook response.");
      }
    });

    it("should throw InternalServiceErrorException if the declination_reason is not set", () => {
      const webhookEvent = {
        event: {
          data: {
            ...bankTransferRejectedWebhookEvent.event.data,
            declination_reason: null,
          },
          type: "bank_transfer_rejected",
        },
        timestamp: bankTransferRejectedWebhookEvent.timestamp,
      };
      const webhookResponseSignature = `t=${webhookEventTime},v1=${createMonoSignature(
        webhookEvent,
        webhookEventTime,
      )}`;

      try {
        monoWebhookHandlers.convertBankTransferRejected(webhookEvent, webhookResponseSignature);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServiceErrorException);
        expect(e.message).toContain("Invalid 'bank_transfer_rejected' webhook response.");
      }
    });

    it("should map all the fields from the request to BankTransferRejectedEvent", () => {
      const webhookResponseSignature = `t=${webhookEventTime},v1=${createMonoSignature(
        bankTransferRejectedWebhookEvent,
        webhookEventTime,
      )}`;
      expect(
        monoWebhookHandlers.convertBankTransferRejected(bankTransferRejectedWebhookEvent, webhookResponseSignature),
      ).toEqual({
        accountID: "acc_16ktUqSO7G0qTHDz8I3qrG",
        amount: 1600000,
        currency: "COP",
        batchID: "bat_2DpSchlriwoCuyGMOoIuwp",
        transferID: "trn_2PVWOx9dZKJMBZw7opjrrs",
        state: MonoTransactionState.CANCELLED,
        declinationReason: "Transaction cancelled by the user",
      });
    });

    it("should throw ServiceException if the transfer state is not known", () => {
      const webhookEvent = {
        event: {
          data: {
            ...bankTransferRejectedWebhookEvent.event.data,
            state: "unknown",
          },
          type: "bank_transfer_rejected",
        },
        timestamp: bankTransferRejectedWebhookEvent.timestamp,
      };
      const webhookResponseSignature = `t=${webhookEventTime},v1=${createMonoSignature(
        webhookEvent,
        webhookEventTime,
      )}`;

      try {
        monoWebhookHandlers.convertBankTransferRejected(webhookEvent, webhookResponseSignature);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ServiceException);
        expect(e.message).toContain("Unknown Mono transfer state");
      }
    });
  });

  describe("convertAccountCredited ()", () => {
    const accountCreditedEvent = {
      event: {
        data: {
          account: { id: "acc_7gIagLj2uJPHBqcoidGQGi", number: "095000809" },
          amount: { amount: 69300000, currency: "COP" },
          description: "Abono SERI COLOMBIA SA BANCOLOMBIA - 901492363 Ref: PROVEEDOR",
          extra: {},
          id: "tx_4jxOSQGZBbFWV672igXiIM",
          payer: {
            bank: { code: "007", name: "BANCOLOMBIA" },
            document_number: "901492363",
            name: "SERI COLOMBIA SA",
          },
          transaction_at: "2023-04-24T22:26:19.000000Z",
          type: "incoming_wire",
        },
        type: "account_credited",
      },
      timestamp: "2023-04-25T13:21:56.316609Z",
    };
    const webhookEventTime = 12345678;
    const webhookResponseValidSignature = `t=${webhookEventTime},v1=${createMonoSignature(
      accountCreditedEvent,
      webhookEventTime,
    )}`;

    describe("Invalid Signature scenarios", () => {
      it("should throw InternalServiceErrorException if the signature is not valid (timestamp is different)", () => {
        const webhookResponseInvalidSignature = `t=${Date.now()},v1=${createMonoSignature(
          accountCreditedEvent,
          webhookEventTime,
        )}`;

        try {
          monoWebhookHandlers.convertAccountCredited(accountCreditedEvent, webhookResponseInvalidSignature);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServiceErrorException);
          expect(e.message).toContain("Invalid Mono signature");
        }
      });

      it("should throw InternalServiceErrorException if the signature is not valid (signature is different)", () => {
        const webhookResponseInvalidSignature = `t=${webhookEventTime},v1=${uuid()}`;

        try {
          monoWebhookHandlers.convertAccountCredited(accountCreditedEvent, webhookResponseInvalidSignature);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServiceErrorException);
          expect(e.message).toContain("Invalid Mono signature");
        }
      });

      it("should throw InternalServiceErrorException if the signature is not valid (rawBody is different)", () => {
        const anotherWebhookEvent = {
          event: {
            data: accountCreditedEvent.event.data,
            type: "bank_transfer_rejected",
          },
          timestamp: accountCreditedEvent.timestamp,
        };

        try {
          monoWebhookHandlers.convertAccountCredited(anotherWebhookEvent, webhookResponseValidSignature);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServiceErrorException);
          expect(e.message).toContain("Invalid Mono signature");
        }
      });
    });

    describe("Invalid event scenarios", () => {
      describe("account", () => {
        const requiredFields = ["id", "number"];
        it.each(requiredFields)("should throw error if '%s' is not set", field => {
          const localAccountCreditedEvent = JSON.parse(JSON.stringify(accountCreditedEvent));
          delete localAccountCreditedEvent.event.data.account[field];

          const signature = `t=${webhookEventTime},v1=${createMonoSignature(
            localAccountCreditedEvent,
            webhookEventTime,
          )}`;

          try {
            monoWebhookHandlers.convertAccountCredited(localAccountCreditedEvent, signature);
            expect(true).toBe(false);
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServiceErrorException);
            expect(e.message).toContain("event.data.account");
            expect(e.message).toContain(field);
          }
        });
      });

      describe("amount", () => {
        const requiredFields = ["amount", "currency"];
        it.each(requiredFields)("should throw error if '%s' is not set", field => {
          const localAccountCreditedEvent = JSON.parse(JSON.stringify(accountCreditedEvent));
          delete localAccountCreditedEvent.event.data.amount[field];

          const signature = `t=${webhookEventTime},v1=${createMonoSignature(
            localAccountCreditedEvent,
            webhookEventTime,
          )}`;

          try {
            monoWebhookHandlers.convertAccountCredited(localAccountCreditedEvent, signature);
            expect(true).toBe(false);
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServiceErrorException);
            expect(e.message).toContain("event.data.amount");
            expect(e.message).toContain(field);
          }
        });
      });

      describe("payer", () => {
        const requiredFields = ["document_number", "name"];
        it.each(requiredFields)("should throw error if '%s' is not set", field => {
          const localAccountCreditedEvent = JSON.parse(JSON.stringify(accountCreditedEvent));
          delete localAccountCreditedEvent.event.data.payer[field];

          const signature = `t=${webhookEventTime},v1=${createMonoSignature(
            localAccountCreditedEvent,
            webhookEventTime,
          )}`;

          try {
            monoWebhookHandlers.convertAccountCredited(localAccountCreditedEvent, signature);
            expect(true).toBe(false);
          } catch (e) {
            expect(e).toBeInstanceOf(InternalServiceErrorException);
            expect(e.message).toContain("event.data.payer");
            expect(e.message).toContain(field);
          }
        });
      });

      const otherTopLevelRequiredFields = ["description", "transaction_at"];
      it.each(otherTopLevelRequiredFields)("should throw error if '%s' is not set", field => {
        const localAccountCreditedEvent = JSON.parse(JSON.stringify(accountCreditedEvent));
        delete localAccountCreditedEvent.event.data[field];

        const signature = `t=${webhookEventTime},v1=${createMonoSignature(
          localAccountCreditedEvent,
          webhookEventTime,
        )}`;

        try {
          monoWebhookHandlers.convertAccountCredited(localAccountCreditedEvent, signature);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServiceErrorException);
          expect(e.message).toContain("event.data");
          expect(e.message).toContain(field);
        }
      });

      it("should throw error if 'type' is not 'account_credited'", () => {
        const localAccountCreditedEvent = JSON.parse(JSON.stringify(accountCreditedEvent));
        localAccountCreditedEvent.event.type = "bank_transfer";

        const signature = `t=${webhookEventTime},v1=${createMonoSignature(
          localAccountCreditedEvent,
          webhookEventTime,
        )}`;

        try {
          monoWebhookHandlers.convertAccountCredited(localAccountCreditedEvent, signature);
          expect(true).toBe(false);
        } catch (e) {
          expect(e).toBeInstanceOf(InternalServiceErrorException);
          expect(e.message).toContain("event.type");
          expect(e.message).toContain("account_credited");
        }
      });
    });

    it("should map all the fields correctly", () => {
      const response = monoWebhookHandlers.convertAccountCredited(accountCreditedEvent, webhookResponseValidSignature);

      expect(response).toStrictEqual({
        accountID: "acc_7gIagLj2uJPHBqcoidGQGi",
        accountNumber: "095000809",
        amount: 69300000,
        currency: MonoCurrency.COP,
        transactionID: "tx_4jxOSQGZBbFWV672igXiIM",
        payerDocumentNumber: "901492363",
        payerName: "SERI COLOMBIA SA",
        description: "Abono SERI COLOMBIA SA BANCOLOMBIA - 901492363 Ref: PROVEEDOR",
      });
    });
  });
});
