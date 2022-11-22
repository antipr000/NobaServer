import { Injectable } from "@nestjs/common";
import { DBProvider } from "../DBProvider";
import { Collection } from "mongodb";
import { Consumer } from "../../modules/consumer/domain/Consumer";
import { PaymentMethod, PaymentMethodType } from "../../modules/consumer/domain/PaymentMethod";
import { CheckoutClient } from "../../modules/psp/checkout.client";
import { PaymentMethodStatus } from "../../modules/consumer/domain/VerificationStatus";

@Injectable()
export class PaymentMethodSchemeMigrator {
  constructor(private readonly dbProvider: DBProvider, private readonly checkoutClient: CheckoutClient) {}

  private async saveDocumentToConsumerCollection(consumer: Consumer) {
    const consumerModel = await this.dbProvider.getUserModel();
    await consumerModel.findByIdAndUpdate(consumer.props._id, { $set: consumer.props }, { new: true });
  }

  // Any error here would crash the application and that is intentional.
  private async convertToNewSchema(queriedPaymentMethodRecord: any) {
    const isCardType: boolean = queriedPaymentMethodRecord.type === PaymentMethodType.CARD;

    if (!isCardType) return queriedPaymentMethodRecord;

    const isOnOlderSchema: boolean =
      queriedPaymentMethodRecord.cardData.scheme === undefined ||
      queriedPaymentMethodRecord.cardData.scheme === null ||
      queriedPaymentMethodRecord.isDefault === undefined ||
      queriedPaymentMethodRecord.isDefault === null;

    if (!isOnOlderSchema) return queriedPaymentMethodRecord;

    // Get Scheme and ensure proper cardType by looking up instrument
    try {
      const checkoutPaymentMethod = await this.checkoutClient.getPaymentMethod(queriedPaymentMethodRecord.paymentToken);

      const migratedRecord: PaymentMethod = {
        type: PaymentMethodType.CARD,
        cardData: {
          first6Digits: queriedPaymentMethodRecord.cardData.first6Digits,
          last4Digits: queriedPaymentMethodRecord.cardData.last4Digits,
          cardType: checkoutPaymentMethod.cardType,
          authCode: queriedPaymentMethodRecord.cardData.authCode,
          authReason: queriedPaymentMethodRecord.cardData.authReason,
          scheme: checkoutPaymentMethod.scheme,
        },
        paymentProviderID: queriedPaymentMethodRecord.paymentProviderID,
        name: queriedPaymentMethodRecord.name,
        imageUri: queriedPaymentMethodRecord.imageUri,
        paymentToken: queriedPaymentMethodRecord.paymentToken,
        status: queriedPaymentMethodRecord.status,
        isDefault: queriedPaymentMethodRecord.isDefault ?? false,
      };

      return migratedRecord;
    } catch (e) {
      console.log(
        `Unable to migrate payment method for paymentProviderID=${queriedPaymentMethodRecord.paymentProviderID}`,
      );
    }
  }

  private async readAndConvertTheEntireCollection(consumerCollection: Collection): Promise<Consumer[]> {
    const consumerDocumentCursor = consumerCollection.find({});
    const allUpdatedRecords: Consumer[] = [];

    while (await consumerDocumentCursor.hasNext()) {
      const consumerDocument = await consumerDocumentCursor.next();
      consumerDocument.paymentMethods = await Promise.all(
        consumerDocument.paymentMethods.map(async paymentMethodRecord => {
          if (paymentMethodRecord && paymentMethodRecord.status === PaymentMethodStatus.DELETED)
            return paymentMethodRecord;
          return await this.convertToNewSchema(paymentMethodRecord);
        }),
      );
      const defaultPaymentMethod = consumerDocument.paymentMethods.filter(paymentMethod => paymentMethod.isDefault);
      if (defaultPaymentMethod.length === 0 && consumerDocument.paymentMethods.length > 0) {
        const index = consumerDocument.paymentMethods.findIndex(
          paymentMethod => paymentMethod.status === PaymentMethodStatus.APPROVED,
        );
        consumerDocument.paymentMethods[index].isDefault = true;
      }

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
    console.log("Migrating the 'PaymentMethods' Card Details of 'Consumer' collection ...");
    const consumerModel = await this.dbProvider.getUserModel();

    const consumerCollection: Collection = consumerModel.collection;
    const allMigratedRecords: Consumer[] = await this.readAndConvertTheEntireCollection(consumerCollection);

    const allOperations = [];
    allMigratedRecords.forEach(record => {
      allOperations.push(this.saveDocumentToConsumerCollection(record));
    });

    await Promise.all(allOperations);
    console.log("Updated all the documents successfully!");
  }
}
