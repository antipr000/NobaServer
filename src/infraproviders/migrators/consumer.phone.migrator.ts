import { Injectable } from "@nestjs/common";
import { DBProvider } from "../DBProvider";
import { Collection } from "mongodb";
import { Consumer } from "../../modules/consumer/domain/Consumer";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";

@Injectable()
export class ConsumerPhoneMigrator {
  private readonly nobaPartnerId: string;
  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    this.nobaPartnerId = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).partnerID;
  }

  private async saveDocumentToConsumerCollection(consumer: Consumer) {
    const consumerModel = await this.dbProvider.getUserModel();
    await consumerModel.findByIdAndUpdate(consumer.props._id, { $set: consumer.props }, { new: true });
  }

  // Any error here would crash the application and that is intentional.
  private removePhoneNumberSpaces(consumer: any): Consumer {
    const isOnOlderSchema: boolean =
      consumer.phone !== undefined && consumer.phone !== null && consumer.phone.indexOf(" ") > -1;

    if (!isOnOlderSchema) return consumer;

    const migratedRecord: Consumer = {
      ...consumer,
      phone: consumer.phone.replace(/\s/g, ""),
    };

    return migratedRecord;
  }

  private async readAndConvertTheEntireCollection(consumerCollection: Collection): Promise<Consumer[]> {
    const consumerDocumentCursor = consumerCollection.find({});
    const allUpdatedRecords: Consumer[] = [];

    while (await consumerDocumentCursor.hasNext()) {
      const consumerDocument = await consumerDocumentCursor.next();
      const consumer = this.removePhoneNumberSpaces(consumerDocument);

      // Updating the row while the cursor is pointing to that might be error prone.
      // So, storing all the converted records into an in-memory structure.
      allUpdatedRecords.push(
        Consumer.createConsumer({
          ...consumer,
          _id: consumerDocument._id as any,
        }),
      );
    }

    return allUpdatedRecords;
  }

  // This is idempotent and safe to re-run after any failures/crash.
  public async migrate() {
    console.log("Migrating Consumer phone numbers by removing all spaces...");

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
