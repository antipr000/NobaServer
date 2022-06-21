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

@Injectable()
export class DBProvider {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor(private readonly configService: ConfigService) {
    const mongoUri = configService.get<MongoConfigs>(MONGO_CONFIG_KEY).uri;
    Mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
  }

  get userModel(): Model<UserProps> {
    return UserModel;
  }

  get transactionModel(): Model<TransactionProps> {
    return TransactionModel;
  }

  get partnerModel(): Model<PartnerProps> {
    return PartnerModel;
  }

  get partnerAdminModel(): Model<PartnerAdminProps> {
    return PartnerAdminModel;
  }

  get adminModel(): Model<AdminProps> {
    return AdminModel;
  }
}
