import { Injectable } from "@nestjs/common";
import { DBProvider } from "../DBProvider";
import { Collection } from "mongodb";
import { Consumer } from "../../modules/consumer/domain/Consumer";
import { PaymentMethod, PaymentMethodType } from "../../modules/consumer/domain/PaymentMethod";

@Injectable()
export class PaymentMethodsMigrator {
  constructor(private readonly dbProvider: DBProvider) {}

  private async saveDocumentToConsumerCollection(consumer: Consumer) {
    const consumerModel = await this.dbProvider.getUserModel();
    await consumerModel.findByIdAndUpdate(consumer.props._id, { $set: consumer.props }, { new: true });
  }

  // Any error here would crash the application and that is intentional.
  private convertToNewSchema(queriedPaymentMethodRecord: any) {
    const isOnOlderSchema: boolean =
      queriedPaymentMethodRecord.type === undefined || queriedPaymentMethodRecord.type === null;

    if (!isOnOlderSchema) return queriedPaymentMethodRecord;

    const migratedRecord: PaymentMethod = {
      // As there are no "ACH" method yet,
      // it is safe to assume that every payment method is of "CARD" type.
      type: PaymentMethodType.CARD,
      cardData: {
        first6Digits: queriedPaymentMethodRecord.first6Digits,
        last4Digits: queriedPaymentMethodRecord.last4Digits,
        cardType: queriedPaymentMethodRecord.cardType,
        authCode: queriedPaymentMethodRecord.authCode,
        authReason: queriedPaymentMethodRecord.authReason,
      },
      paymentProviderID: queriedPaymentMethodRecord.paymentProviderID,
      name: queriedPaymentMethodRecord.cardName,
      imageUri: queriedPaymentMethodRecord.imageUri,
      paymentToken: queriedPaymentMethodRecord.paymentToken,
      status: queriedPaymentMethodRecord.status,
    };

    return migratedRecord;
  }

  private async readAndConvertTheEntireCollection(consumerCollection: Collection): Promise<Consumer[]> {
    const consumerDocumentCursor = consumerCollection.find({});
    const allUpdatedRecords: Consumer[] = [];

    while (await consumerDocumentCursor.hasNext()) {
      const consumerDocument = await consumerDocumentCursor.next();
      consumerDocument.paymentMethods = consumerDocument.paymentMethods.map(paymentMethodRecord => {
        return this.convertToNewSchema(paymentMethodRecord);
      });

      // Updating the row while the cursor is pointing to that might be error prone.
      // So, storing all the converted records into an in-memory structure.
      allUpdatedRecords.push(
        Consumer.createConsumer({
          ...consumerDocument,
          _id: consumerDocument._id as any,
        }),
      );
    }

    return allUpdatedRecords;
  }

  // This is idempotent and safe to re-run after any failures/crash.
  public async migrate() {
    console.log("Migrating the 'PaymentMethods' field of 'Consumer' collection ...");

    const consumerModel = await this.dbProvider.getUserModel();

    const consumerCollection: Collection = consumerModel.collection;
    const allMigratedRecords: Consumer[] = await this.readAndConvertTheEntireCollection(consumerCollection);

    console.log(`Read ${allMigratedRecords.length} records. Saving them to database ...`);

    const allOperations = [];
    allMigratedRecords.forEach(record => {
      allOperations.push(this.saveDocumentToConsumerCollection(record));
    });

    await Promise.all(allOperations);
    console.log(`Updated all the documents successfully!`);
  }
}
