import { TransactionEvent } from "../domain/TransactionEvent";
import { FeeType, TransactionFee } from "../domain/TransactionFee";
import { toTransactionEventDTO, toTransactionFeesDTO } from "../mapper/transaction.mapper.util";

describe("transaction.mapper.util suite", () => {
  jest.setTimeout(2000);

  describe("toTransactionEventDTO ()", () => {
    it("should populate 'all' the fields if everything is set", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "INTERNAL_MESSAGE_WITH_DETAILS_KEY_AND_PARAMS",
        timestamp: new Date(),
        transactionID: "ID",
        details: "DETAILS",
        internal: true,
        key: "KEY",
        param1: "PARAM1",
        param2: "PARAM2",
        param3: "PARAM3",
        param4: "PARAM4",
        param5: "PARAM5",
      };

      expect(toTransactionEventDTO(transactionEvent)).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "INTERNAL_MESSAGE_WITH_DETAILS_KEY_AND_PARAMS",
        details: "DETAILS",
        key: "KEY",
        parameters: ["PARAM1", "PARAM2", "PARAM3", "PARAM4", "PARAM5"],
      });
    });

    it("shouldn't populate 'detail' field if it is not present", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: true,
        key: "KEY",
        param1: "PARAM1",
        param2: "PARAM2",
        param3: "PARAM3",
        param4: "PARAM4",
        param5: "PARAM5",
      };

      expect(toTransactionEventDTO(transactionEvent)).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "message",
        key: "KEY",
        parameters: ["PARAM1", "PARAM2", "PARAM3", "PARAM4", "PARAM5"],
      });
    });

    it("shouldn't populate 'key' field if it is not present", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: true,
        details: "DETAILS",
        param1: "PARAM1",
        param2: "PARAM2",
        param3: "PARAM3",
        param4: "PARAM4",
        param5: "PARAM5",
      };

      expect(toTransactionEventDTO(transactionEvent)).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "message",
        details: "DETAILS",
        parameters: ["PARAM1", "PARAM2", "PARAM3", "PARAM4", "PARAM5"],
      });
    });

    it("shouldn't populate 'parameters' field if it is not present", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: true,
        details: "DETAILS",
        key: "KEY",
      };

      expect(toTransactionEventDTO(transactionEvent)).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: true,
        message: "message",
        details: "DETAILS",
        key: "KEY",
      });
    });

    it("should return translated transaction event message", () => {
      const transactionEvent: TransactionEvent = {
        id: "ID_1",
        message: "message",
        timestamp: new Date(),
        transactionID: "ID",
        internal: false,
        details: "DETAILS",
        key: "KEY",
      };

      expect(toTransactionEventDTO(transactionEvent)).toEqual({
        timestamp: transactionEvent.timestamp,
        internal: false,
        message: "TRANSLATED_MESSAGE",
        details: "DETAILS",
        key: "KEY",
        text: "test",
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
