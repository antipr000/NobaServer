import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Model } from "mongoose";
import Mongoose from "mongoose";
import { TransactionProps } from "../modules/transactions/domain/Transaction";
import { TransactionModel } from "../infra/mongodb/models/TransactionModel";
import { MongoConfigs } from "../config/configtypes/MongoConfigs";
import { MONGO_CONFIG_KEY } from "../config/ConfigurationUtils";
import { CustomConfigService } from "../core/utils/AppConfigModule";
import path from "path";

@Injectable()
export class DBProvider {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly configService: CustomConfigService;

  private isConnectedToDb = false;

  // Doesn't defined in constructor as 'Mongoose.connect' is an async function.
  // If called in 'constructor', you can't 'await' (constructor can't be async)
  // which will lead to flaky behaviour during the initial phase of the service startup.
  private async connectToDb(): Promise<void> {
    if (this.isConnectedToDb) return;

    const mongoConfigs: MongoConfigs = this.configService.get<MongoConfigs>(MONGO_CONFIG_KEY);
    const mongoUri = mongoConfigs.uri;
    const mongoose = await Mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
      ...(mongoConfigs.sslEnabled && { sslCA: path.join(__dirname, "../", mongoConfigs.sslCAPath) }), // we bootstrap sslCafile in root project directory in code deploy and this file will eventually end up in /dist/main.js
    });
    mongoose.set("returnOriginal", false);
    this.isConnectedToDb = true;
  }

  // // Remove this as soon as all the repositories are using Models through 'DBProvider'.
  // constructor() {
  //   this.connectToDb();
  // }

  async getTransactionModel(): Promise<Model<TransactionProps>> {
    await this.connectToDb();
    await TransactionModel.ensureIndexes();
    return TransactionModel;
  }
}
