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

      expect(toTransactionEventDTO(transactionEvent)).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "default message",
        text: "default message",
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

      expect(toTransactionEventDTO(transactionEvent)).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "default message",
        details: "DETAILS",
        text: "default message",
      });
    });

    it("Should fill text with message if key is not found", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "default message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: true,
        details: "DETAILS",
        key: "NOT_FOUND",
      };

      expect(toTransactionEventDTO(transactionEvent, "test")).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "default message",
        details: "DETAILS",
        text: "default message",
      });
    });

    it("should return translated transaction event text with params", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "default message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: false,
        details: "DETAILS",
        key: "PARAMS_TEST",
        param1: "PARAM1",
        param2: "PARAM2",
        param3: "PARAM3",
        param4: "PARAM4",
        param5: "PARAM5",
      };

      expect(toTransactionEventDTO(transactionEvent, "test")).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: false,
        message: "default message",
        details: "DETAILS",
        text: "Param 1:PARAM1, Param 2:PARAM2, Param 3:PARAM3, Param 4:PARAM4, Param 5:PARAM5",
      });
    });

    it("should return translated transaction event text with no params", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "default message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: false,
        details: "DETAILS",
        key: "NO_PARAMS_TEST",
      };

      expect(toTransactionEventDTO(transactionEvent, "test")).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: false,
        message: "default message",
        details: "DETAILS",
        text: "No Params.",
      });
    });

    it("should return translated transaction event text with params but ignore them", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "default message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: false,
        details: "DETAILS",
        key: "NO_PARAMS_TEST",
        param1: "PARAM1",
        param2: "PARAM2",
        param3: "PARAM3",
        param4: "PARAM4",
        param5: "PARAM5",
      };

      expect(toTransactionEventDTO(transactionEvent, "test")).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: false,
        message: "default message",
        details: "DETAILS",
        text: "No Params.",
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

      expect(toTransactionEventDTO(transactionEvent, "test")).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: false,
        message: "default message",
        details: "DETAILS",
        text: "Unexpected error occurred.",
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
