import { Injectable } from "@nestjs/common";
import { DBProvider } from "../DBProvider";
import { Collection } from "mongodb";
import { ConsumerProps } from "src/modules/consumer/domain/Consumer";

@Injectable()
export class ConsumerHandleMigrator {
  constructor(private readonly dbProvider: DBProvider) {}

  private userHandles = {};

  private async saveDocumentToConsumerCollection(consumerProps: ConsumerProps) {
    const consumerModel = await this.dbProvider.getUserModel();
    await consumerModel.findByIdAndUpdate(consumerProps._id, { $set: consumerProps }).exec();
  }

  private populateUserHandles(consumerRecords: ConsumerProps[]) {
    const randomNumber: number = Math.round(Math.random() * 1000);
    consumerRecords.forEach((record, ind) => {
      this.userHandles[record.email] = `${record.firstName ?? ""}${randomNumber + ind}`;
    });
  }

  // Any error here would crash the application and that is intentional.
  private convertToNewSchema(queriedConsumerRecord: any): ConsumerProps {
    const isOnOlderSchema: boolean =
      queriedConsumerRecord.handle === undefined || queriedConsumerRecord.handle === null;

    if (!isOnOlderSchema) return queriedConsumerRecord;

    queriedConsumerRecord["handle"] = this.userHandles[queriedConsumerRecord.email];
    return queriedConsumerRecord;
  }

  private async readAndConvertTheEntireCollection(consumerCollection: Collection): Promise<ConsumerProps[]> {
    const consumerDocumentCursor = consumerCollection.find({});

    const allOldConsumerRecords = [];
    while (await consumerDocumentCursor.hasNext()) {
      const consumerDocument = await consumerDocumentCursor.next();
      allOldConsumerRecords.push(consumerDocument);
    }

    this.populateUserHandles(allOldConsumerRecords);

    const migratedConsumerRecords = [];
    allOldConsumerRecords.forEach(oldRecord => {
      migratedConsumerRecords.push(this.convertToNewSchema(oldRecord));
    });
    return migratedConsumerRecords;
  }

  // This is idempotent and safe to re-run after any failures/crash.
  public async migrate() {
    console.log("Migrating the 'handle' of 'Consumer' collection ...");

    const consumerModel = await this.dbProvider.getUserModel();

    const consumerCollection: Collection = consumerModel.collection;
    const allMigratedRecords: ConsumerProps[] = await this.readAndConvertTheEntireCollection(consumerCollection);

    const allOperations = [];
    allMigratedRecords.forEach(record => {
      allOperations.push(this.saveDocumentToConsumerCollection(record));
    });

    await Promise.all(allOperations);
    console.log("Updated all the consumer records successfully!");
  }
}
