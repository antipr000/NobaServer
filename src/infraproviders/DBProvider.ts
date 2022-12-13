import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Model } from "mongoose";
import { Consumer as ConsumerProps } from "../generated/domain/consumer";
import { UserModel } from "../infra/mongodb/models/UserModel";
import Mongoose from "mongoose";
import { TransactionProps } from "../modules/transactions/domain/Transaction";
import { TransactionModel } from "../infra/mongodb/models/TransactionModel";
import { AdminProps } from "../modules/admin/domain/Admin";
import { AdminModel } from "../infra/mongodb/models/AdminModel";
import { MongoConfigs } from "../config/configtypes/MongoConfigs";
import { MONGO_CONFIG_KEY } from "../config/ConfigurationUtils";
import { OtpModel } from "../infra/mongodb/models/OtpModel";
import { OtpProps } from "../modules/auth/domain/Otp";
import { CustomConfigService } from "../core/utils/AppConfigModule";
import { VerificationDataProps } from "../modules/verification/domain/VerificationData";
import { VerificationDataModel } from "../infra/mongodb/models/VerificationDataModel";
import { LockModel } from "../infra/mongodb/models/LockModel";
import { LockProps } from "../modules/common/domain/Lock";
import path from "path";
import { CreditCardBinDataProps } from "../modules/common/domain/CreditCardBinData";
import { CreditCardBinDataModel } from "../infra/mongodb/models/CreditCardBinDataModel";
import { LimitProfileModel } from "../infra/mongodb/models/LimitProfileModel";
import { LimitProfileProps } from "../modules/transactions/domain/LimitProfile";
import { LimitConfigurationProps } from "../modules/transactions/domain/LimitConfiguration";
import { LimitConfigurationModel } from "../infra/mongodb/models/LimitConfigurationModel";

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

  async getOtpModel(): Promise<Model<OtpProps>> {
    await this.connectToDb();
    return OtpModel;
  }

  async getUserModel(): Promise<Model<ConsumerProps>> {
    await this.connectToDb();
    return UserModel;
  }

  async getTransactionModel(): Promise<Model<TransactionProps>> {
    await this.connectToDb();
    await TransactionModel.ensureIndexes();
    return TransactionModel;
  }

  async getAdminModel(): Promise<Model<AdminProps>> {
    await this.connectToDb();
    return AdminModel;
  }

  async getVerificationDataModel(): Promise<Model<VerificationDataProps>> {
    await this.connectToDb();
    return VerificationDataModel;
  }

  async getLockModel(): Promise<Model<LockProps>> {
    await this.connectToDb();
    await LockModel.ensureIndexes();
    return LockModel;
  }

  async getCreditCardBinDataModel(): Promise<Model<CreditCardBinDataProps>> {
    await this.connectToDb();
    return CreditCardBinDataModel;
  }

  async getLimitProfileModel(): Promise<Model<LimitProfileProps>> {
    await this.connectToDb();
    return LimitProfileModel;
  }

  async getLimitConfigurationModel(): Promise<Model<LimitConfigurationProps>> {
    await this.connectToDb();
    return LimitConfigurationModel;
  }
}
