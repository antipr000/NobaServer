import { getRandomActiveConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { TransactionNotificationPayloadMapper } from "../domain/TransactionNotificationParameters";
import { getRandomTransaction } from "../../../modules/transaction/test_utils/test.utils";
import { Transaction } from "../../../modules/transaction/domain/Transaction";

describe("TransactionNotificationPayloadMapper Tests", () => {
  describe("toWithdrawalFailedNotificationParameters", () => {
    it.each([
      ["en-us", "Transaction failed."],
      ["es-co", "La transacción falló."],
    ])(
      "should return a correct reason declined for WithdrawalFailedNotificationParameters based on locale",
      (locale, expectedReason) => {
        const transaction: Transaction = getRandomTransaction("consumerID");

        expect(
          TransactionNotificationPayloadMapper.toWithdrawalFailedNotificationParameters(transaction, locale)
            .reasonDeclined,
        ).toEqual(expectedReason);
      },
    );

    it.each([
      ["US", "Transaction failed."],
      ["CO", "La transacción falló."],
    ])(
      "should return a correct reason declined for TransferFailedNotificationParameters based on locale",
      (countryCode, expectedReason) => {
        const debitConsumer = getRandomActiveConsumer("1", countryCode);
        const creditConsumer = getRandomActiveConsumer("1", countryCode);
        const transaction: Transaction = getRandomTransaction(debitConsumer.props.id);

        expect(
          TransactionNotificationPayloadMapper.toTransferFailedNotificationParameters(
            transaction,
            debitConsumer,
            creditConsumer,
          ).reasonDeclined,
        ).toEqual(expectedReason);
      },
    );

    it.each([
      ["en-us", "Transaction failed."],
      ["es-co", "La transacción falló."],
    ])(
      "should return a correct reason declined for WithdrawalFailedNotificationParameters based on locale",
      (locale, expectedReason) => {
        const transaction: Transaction = getRandomTransaction("consumerID");

        expect(
          TransactionNotificationPayloadMapper.toWithdrawalFailedNotificationParameters(transaction, locale)
            .reasonDeclined,
        ).toEqual(expectedReason);
      },
    );

    it.each([
      ["en-us", "Transaction failed."],
      ["es-co", "La transacción falló."],
    ])(
      "should return a correct reason declined for DebitAdjustmentFailedNotificationParameters based on locale",
      (locale, expectedReason) => {
        const transaction: Transaction = getRandomTransaction("consumerID");

        expect(
          TransactionNotificationPayloadMapper.toDebitAdjustmentFailedNotificationParameters(transaction, locale)
            .reasonDeclined,
        ).toEqual(expectedReason);
      },
    );

    it.each([
      ["en-us", "Transaction failed."],
      ["es-co", "La transacción falló."],
    ])(
      "should return a correct reason declined for CreditAdjustmentFailedNotificationParameters based on locale",
      (locale, expectedReason) => {
        const transaction: Transaction = getRandomTransaction("consumerID");

        expect(
          TransactionNotificationPayloadMapper.toCreditAdjustmentFailedNotificationParameters(transaction, locale)
            .reasonDeclined,
        ).toEqual(expectedReason);
      },
    );
  });
});
