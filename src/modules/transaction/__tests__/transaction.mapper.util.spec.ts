import { TransactionEvent } from "../domain/TransactionEvent";
import { FeeType, TransactionFee } from "../domain/TransactionFee";
import { toTransactionEventDTO, toTransactionFeesDTO } from "../mapper/transaction.mapper.util";

describe("transaction.mapper.util suite", () => {
  jest.setTimeout(2000);

  describe("toTransactionEventDTO ()", () => {
    it("shouldn't populate 'detail' field if it is not present", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "default message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: true,
        key: "KEY",
      };

      expect(toTransactionEventDTO(transactionEvent)).resolves.toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "default message",
        text: "",
      });
    });

    it("shouldn't populate 'key' field if it is not present", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "default message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: true,
        details: "DETAILS",
      };

      expect(toTransactionEventDTO(transactionEvent)).resolves.toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "default message",
        details: "DETAILS",
        text: "",
      });
    });

    it("should default translated transaction event text to english", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "default message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: false,
        details: "DETAILS",
        key: "INTERNAL_ERROR",
      };

      expect(toTransactionEventDTO(transactionEvent, "")).resolves.toEqual({
        timestamp: transactionEvent.timestamp,
        internal: false,
        message: "default message",
        details: "DETAILS",
        text: "Unexpected error occurred.",
      });
    });

    it.each([
      ["en_us", "Insufficient Funds for account 12345."],
      ["es_co", "Fondos insuficientes para la cuenta 12345."],
      ["en", "Insufficient Funds for account 12345."],
      ["es", "Fondos insuficientes para la cuenta 12345."],
      [undefined, "Insufficient Funds for account 12345."],
      [null, "Insufficient Funds for account 12345."],
      ["", "Insufficient Funds for account 12345."],
    ])("should return translated insufficient funds text with params in %s", (language, translatedText) => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "default message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: false,
        details: "DETAILS",
        key: "INSUFFICIENT_FUNDS",
        param1: "12345",
      };

      expect(toTransactionEventDTO(transactionEvent, language)).resolves.toEqual({
        timestamp: transactionEvent.timestamp,
        internal: false,
        message: "default message",
        details: "DETAILS",
        text: translatedText,
      });
    });
  });

  describe("toTransactionFeesDTO", () => {
    it("should populate 'all' the fields if everything is set", () => {
      const transactionFee: TransactionFee = {
        amount: 100,
        currency: "EUR",
        type: FeeType.NOBA,
        id: "ID",
        timestamp: new Date(),
      };

      expect(toTransactionFeesDTO(transactionFee)).toEqual({
        amount: 100,
        currency: "EUR",
        type: "NOBA",
      });
    });
  });
});
