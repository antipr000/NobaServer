import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Model } from "mongoose";
import { ConsumerProps } from "../modules/consumer/domain/Consumer";
import { UserModel } from "../infra/mongodb/models/UserModel";
import * as Mongoose from "mongoose";
import { TransactionProps } from "../modules/transactions/domain/Transaction";
import { TransactionModel } from "../infra/mongodb/models/TransactionModel";
import { PartnerProps } from "../modules/partner/domain/Partner";
import { PartnerAdminProps } from "../modules/partner/domain/PartnerAdmin";
import { PartnerModel } from "../infra/mongodb/models/PartnerModel";
import { PartnerAdminModel } from "../infra/mongodb/models/PartnerAdminModel";
import { AdminProps } from "../modules/admin/domain/Admin";
import { AdminModel } from "../infra/mongodb/models/AdminModel";
import { MongoConfigs } from "../config/configtypes/MongoConfigs";
import { MONGO_CONFIG_KEY } from "../config/ConfigurationUtils";
import { OtpModel } from "../infra/mongodb/models/OtpModel";
import { OtpProps } from "../modules/auth/domain/Otp";
import { CustomConfigService } from "../core/utils/AppConfigModule";
import { VerificationDataProps } from "../modules/verification/domain/VerificationData";
import { VerificationDataModel } from "../infra/mongodb/models/VerificationDataModel";
import * as path from "path";

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
    await Mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000,
      ...(mongoConfigs.sslEnabled && { sslCA: path.join(__dirname, "../", mongoConfigs.sslCAPath) }), // we bootstrap sslCafile in root project directory in code deploy and this file will eventually end up in /dist/main.js
    });
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
    return TransactionModel;
  }

  async getPartnerModel(): Promise<Model<PartnerProps>> {
    await this.connectToDb();
    return PartnerModel;
  }

  async getPartnerAdminModel(): Promise<Model<PartnerAdminProps>> {
    await this.connectToDb();
    return PartnerAdminModel;
  }

  async getAdminModel(): Promise<Model<AdminProps>> {
    await this.connectToDb();
    return AdminModel;
  }

  async getVerificationDataModel(): Promise<Model<VerificationDataProps>> {
    await this.connectToDb();
    return VerificationDataModel;
  }
}
