import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Model } from "mongoose";
import { UserProps } from "../modules/user/domain/User";
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

@Injectable()
export class DBProvider {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly configService: ConfigService;

  private isConnectedToDb = false;

  // Doesn't defined in constructor as 'Mongoose.connect' is an async function.
  // If called in 'constructor', you can't 'await' (constructor can't be async)
  // which will lead to flaky behaviour during the initial phase of the service startup.
  private async connectToDb(): Promise<void> {
    if (this.isConnectedToDb) return;

    const mongoUri = this.configService.get<MongoConfigs>(MONGO_CONFIG_KEY).uri;
    await Mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
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

  async getUserModel(): Promise<Model<UserProps>> {
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
}
