import { Injectable } from "@nestjs/common";
import { DBProvider } from "../DBProvider";
import { Collection } from "mongodb";
import { Consumer } from "../../modules/consumer/domain/Consumer";
import { PaymentMethod, PaymentMethodType } from "../../modules/consumer/domain/PaymentMethod";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { CryptoWallet } from "../../modules/consumer/domain/CryptoWallet";
import { WalletStatus } from "../../modules/consumer/domain/VerificationStatus";

@Injectable()
export class ConsumerMigrator {
  private readonly nobaPartnerId: string;
  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    this.nobaPartnerId = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).partnerID;
  }

  private async saveDocumentToConsumerCollection(consumer: Consumer) {
    const consumerModel = await this.dbProvider.getUserModel();
    await consumerModel.findByIdAndUpdate(consumer.props._id, { $set: consumer.props }, { new: true });
  }

  // Any error here would crash the application and that is intentional.
  private convertPaymentMethodToNewSchema(queriedPaymentMethodRecord: any) {
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
      isDefault: queriedPaymentMethodRecord.isDefault ?? false,
    };

    return migratedRecord;
  }

  private convertCryptoWalletsToNewSchema(cryptoWallet: any) {
    const migratedRecord: CryptoWallet = {
      walletName: cryptoWallet.walletName,
      address: cryptoWallet.address,
      chainType: cryptoWallet.chainType,
      isEVMCompatible: cryptoWallet.isEVMCompatible,
      status: cryptoWallet.status ?? WalletStatus.PENDING,
      partnerID: cryptoWallet.partnerID ?? this.nobaPartnerId,
      riskScore: cryptoWallet.riskScore,
      isPrivate: cryptoWallet.isPrivate ?? true,
    };

    return migratedRecord;
  }

  private async readAndConvertTheEntireCollection(consumerCollection: Collection): Promise<Consumer[]> {
    const consumerDocumentCursor = consumerCollection.find({});
    const allUpdatedRecords: Consumer[] = [];

    while (await consumerDocumentCursor.hasNext()) {
      const consumerDocument = await consumerDocumentCursor.next();
      consumerDocument.paymentMethods = consumerDocument.paymentMethods.map(paymentMethodRecord => {
        return this.convertPaymentMethodToNewSchema(paymentMethodRecord);
      });

      consumerDocument.cryptoWallets = consumerDocument.cryptoWallets.map(cryptoWallet => {
        return this.convertCryptoWalletsToNewSchema(cryptoWallet);
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
    console.log("Migrating the 'Consumers' ...");

    const consumerModel = await this.dbProvider.getUserModel();

    const consumerCollection: Collection = consumerModel.collection;
    const allMigratedRecords: Consumer[] = await this.readAndConvertTheEntireCollection(consumerCollection);

    console.log(`Read ${allMigratedRecords.length} records. Saving them to database ...`);

    const allOperations = [];
    allMigratedRecords.forEach(record => {
      allOperations.push(this.saveDocumentToConsumerCollection(record));
    });

    await Promise.all(allOperations);
    console.log("Updated all the documents successfully!");
  }
}
