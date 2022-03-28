import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { DynamoDBConfigs } from 'src/config/configtypes/DynamoDBConfigs';
import { DDB_CONFIG_KEY } from 'src/config/ConfigurationUtils';
import { DyanamoDataMapperExtended } from 'src/infra/dynamodb/DDBDataMapperExtended';
import { Logger } from 'winston';

import * as Mongoose from "mongoose";



@Injectable()
export class DBProvider {


  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;  

  private readonly _dynamoClient: DynamoDB;

  constructor(private readonly configService: ConfigService) {
    //todo read configs
    //todo read configs

    const ddbConfigs: DynamoDBConfigs = this.configService.get<DynamoDBConfigs>(DDB_CONFIG_KEY);

    this._dynamoClient = new DynamoDB({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      endpoint: ddbConfigs.endpoint,
      region: ddbConfigs.awsRegion,
      logger: ddbConfigs.logQueries? console : undefined
    }); 

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
}
