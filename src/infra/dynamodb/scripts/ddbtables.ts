import DynamoDB, { AttributeDefinitions } from "aws-sdk/clients/dynamodb";

import * as _ from "lodash";
import { HASH_KEY_TYPE, RANGE_KEY_TYPE } from "../DDBUtils";

import {
  UsersTableMeta,
} from "../UsersTable";
import { LookupTableGSI1, LookupTableMeta } from "../LookupTable";


//Only for local, in production we would use dynamic pricing, and cloudformation to create tables but below definition can be used to create cloudformation/terraform definitions
const usersTable: DynamoDB.CreateTableInput = {
  TableName: UsersTableMeta.tableName,
  KeySchema: [
    {
      AttributeName: UsersTableMeta.partitionKeyAttribute,
      KeyType: HASH_KEY_TYPE,
    }, //Partition key
    { AttributeName: UsersTableMeta.sortKeyAttribute, KeyType: RANGE_KEY_TYPE },
  ],
  AttributeDefinitions: getUniqueAttributeDefinitions([
    { AttributeName: UsersTableMeta.partitionKeyAttribute, AttributeType: "S" },
    { AttributeName: UsersTableMeta.sortKeyAttribute, AttributeType: "S" },
    
  ]),
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  }
};


const lookUpTable: DynamoDB.CreateTableInput = {
  TableName: LookupTableMeta.tableName,
  KeySchema: [
    { AttributeName: LookupTableMeta.partitionKeyAttribute, KeyType: "HASH" },
    { AttributeName: LookupTableMeta.sortKeyAttribute, KeyType: "RANGE" },
  ],
  AttributeDefinitions: getUniqueAttributeDefinitions([
    { AttributeName: LookupTableMeta.partitionKeyAttribute, AttributeType: "S", },
    { AttributeName: LookupTableMeta.sortKeyAttribute, AttributeType: "S" },
    { AttributeName: LookupTableGSI1.partitionKeyAttribute, AttributeType: "S" },
    { AttributeName: LookupTableGSI1.sortKeyAttribute, AttributeType: "S" },
  ]),

  GlobalSecondaryIndexes: [
    {
      IndexName: LookupTableGSI1.gsiName,
      KeySchema: [
        {
          AttributeName: LookupTableGSI1.partitionKeyAttribute,
          KeyType: "HASH",
        },
        {
          AttributeName: LookupTableGSI1.sortKeyAttribute,
          KeyType: "RANGE",
        },
      ],

      Projection: {
        ProjectionType: "ALL",
      },
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    }
  ],

  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  },
};



function getUniqueAttributeDefinitions(
  attrs: AttributeDefinitions
): AttributeDefinitions {
  return _.uniqBy(attrs, function (e) {
    return e.AttributeName;
  });
}

export const ddbTables: DynamoDB.CreateTableInput[] = [
  usersTable,
  lookUpTable,
];
