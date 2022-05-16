import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { DyanamoDataMapperExtended } from '../infra/dynamodb/DDBDataMapperExtended';
import { Logger } from 'winston';
import {Model} from "mongoose";
import { UserProps } from '../modules/user/domain/User';
import { UserModel } from "../infra/mongodb/models/UserModel";
import * as Mongoose from "mongoose";
import { TransactionProps } from '../modules/transactions/domain/Transaction';
import { TransactionModel } from '../infra/mongodb/models/TransactionModel';



@Injectable()
export class DBProvider {


  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;  

  private readonly _dynamoClient: DynamoDB;

  constructor(private readonly configService: ConfigService) {
    //todo read configs
    //todo read configs

    const mongoUri =  `mongodb+srv://nobamongo:NobaMongo@cluster0.wjsia.mongodb.net/devdb`; //TODO create configs for this and separate url from creds

    Mongoose.connect(mongoUri, {serverSelectionTimeoutMS: 2000});
  }

  get dynamoClient(): DynamoDB {
    return this._dynamoClient;
  }

  get dynamoDataMapper(): DyanamoDataMapperExtended {
    //DONOT CHANGE ANYTHING HERE IF YOU DON"T KNOW WHAT YOU ARE DOING!!
    return new DyanamoDataMapperExtended({client: this._dynamoClient, skipVersionCheck: false});
  }

  get userModel(): Model<UserProps> {
    return UserModel;
  }

  get transactionModel(): Model<TransactionProps> {
    return TransactionModel;
  }
}
