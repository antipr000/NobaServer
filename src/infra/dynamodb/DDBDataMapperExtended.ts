/* eslint-disable prefer-const */

import { TableOptions } from "@aws/dynamodb-batch-iterator";
import {
  DeleteOptions,
  DynamoDbTable,
  getSchema,
  PutOptions,
  StringToAnyObjectMap,
  UpdateOptions,
  DataMapper,
  DataMapperConfiguration,
} from "@aws/dynamodb-data-mapper";
import {
  isKey,
  marshallConditionExpression,
  marshallItem,
  marshallKey,
  marshallUpdateExpression,
  marshallValue,
  SchemaType,
} from "@aws/dynamodb-data-marshaller";
import {
  AttributePath,
  AttributeValue,
  ConditionExpression,
  ExpressionAttributes,
  FunctionExpression,
  MathematicalExpression,
  PathElement,
  UpdateExpression,
} from "@aws/dynamodb-expressions";
import { Delete, Put, Update } from "aws-sdk/clients/dynamodb";
import * as DynamoDB from "aws-sdk/clients/dynamodb";
import { TransactWriteItemsInput } from "aws-sdk/clients/dynamodb";

/**
 * https://github.com/awslabs/dynamodb-data-mapper-js/blob/master/packages/dynamodb-data-mapper/src/DataMapper.ts
 *   DataMapper class doesn't support transactions so creating missing pieces below
 *  feel free to contribute this back to the original repo in your leisure time.
 */

export class DyanamoDataMapperExtended extends DataMapper {
  private readonly _skipVersionCheck;
  private readonly prefixTableName;

  private readonly _dynamoClient: DynamoDB;

  constructor(options: DataMapperConfiguration) {
    super(options);
    this._skipVersionCheck = options.skipVersionCheck == undefined ? false : options.skipVersionCheck;
    this.prefixTableName = options.tableNamePrefix ? options.tableNamePrefix : "";
    this._dynamoClient = options.client;
  }

  async executeWriteTransaction(input: TransactWriteItemsInput): Promise<any> {
    return new Promise<any>((res, rej) => {
      this._dynamoClient.transactWriteItems(input, (err, data) => {
        if (!err) {
          res(data);
        } else {
          rej(err);
        }
      });
    });
  }

  /**
   * Doesn't do any db operations just builds put request item, request building logic copied from original repo (credit) and execution logic skipped
   *
   * @param itemOrParameters
   * @param options
   * @returns
   */
  putRequest<T extends StringToAnyObjectMap = StringToAnyObjectMap>(
    itemOrParameters: T,
    options: PutOptions = {},
  ): Put {
    const item: T = itemOrParameters as T;

    let {
      condition,
      skipVersionCheck = this._skipVersionCheck, //take from constructor
    } = options;
    const schema = getSchema(item);
    const req: Put = {
      TableName: getTableName(item),
      Item: marshallItem(schema, item),
    };
    if (!skipVersionCheck) {
      for (const key of Object.keys(schema)) {
        const inputMember = item[key];
        const fieldSchema = schema[key];
        const { attributeName = key } = fieldSchema;
        if (isVersionAttribute(fieldSchema)) {
          const { condition: versionCond } = handleVersionAttribute(key, inputMember);
          if (req.Item[attributeName]) {
            req.Item[attributeName].N = (Number(req.Item[attributeName].N) + 1).toString();
          } else {
            req.Item[attributeName] = { N: "0" };
          }
          condition = condition ? { type: "And", conditions: [condition, versionCond] } : versionCond;
        }
      }
    }
    if (condition) {
      const attributes = new ExpressionAttributes();
      req.ConditionExpression = marshallConditionExpression(condition, schema, attributes).expression;
      if (Object.keys(attributes.names).length > 0) {
        req.ExpressionAttributeNames = attributes.names;
      }
      if (Object.keys(attributes.values).length > 0) {
        req.ExpressionAttributeValues = attributes.values;
      }
    }
    return req;
  }

  /**
   *  Doesn't do anything with DB just prepares update request, request building logic copied from original repo (credit) and execution logic skipped
   */
  updateRequest<T extends StringToAnyObjectMap = StringToAnyObjectMap>(
    itemOrParameters: T,
    options: UpdateOptions = {},
  ): Update {
    const item: T = itemOrParameters as T;

    let { condition, onMissing = "remove", skipVersionCheck = this._skipVersionCheck } = options;
    const schema = getSchema(item);
    const expr = new UpdateExpression();
    const itemKey: { [propertyName: string]: any } = {};
    for (const key of Object.keys(schema)) {
      const inputMember = item[key];
      const fieldSchema = schema[key];
      if (isKey(fieldSchema)) {
        itemKey[key] = inputMember;
      } else if (isVersionAttribute(fieldSchema)) {
        const { condition: versionCond, value } = handleVersionAttribute(key, inputMember);
        expr.set(key, value);
        if (!skipVersionCheck) {
          condition = condition ? { type: "And", conditions: [condition, versionCond] } : versionCond;
        }
      } else if (inputMember === undefined) {
        if (onMissing === "remove") {
          expr.remove(key);
        }
      } else {
        const marshalled = marshallValue(fieldSchema, inputMember);
        if (marshalled) {
          expr.set(key, new AttributeValue(marshalled));
        }
      }
    }

    const tableName = getTableName(item);

    const req: Update = {
      TableName: this.prefixTableName + tableName,
      Key: marshallKey(schema, itemKey),
      UpdateExpression: "", //will be updated below, empty here to satisfy type check
    };

    const attributes = new ExpressionAttributes();

    if (options.condition) {
      req.ConditionExpression = marshallConditionExpression(options.condition, schema, attributes).expression;
    }

    req.UpdateExpression = marshallUpdateExpression(expr, schema, attributes).expression;

    if (Object.keys(attributes.names).length > 0) {
      req.ExpressionAttributeNames = attributes.names;
    }

    if (Object.keys(attributes.values).length > 0) {
      req.ExpressionAttributeValues = attributes.values;
    }

    return req;
  }

  /**
   * create deletes requests, doesn't do anything with DB, request building logic copied from original repo (credit) and execution logic skipped
   */

  deleteRequest<T extends StringToAnyObjectMap = StringToAnyObjectMap>(
    itemOrParameters: TableOptions,
    options: DeleteOptions = {},
  ): Delete {
    const item: T = itemOrParameters as T;

    let { condition, skipVersionCheck = this._skipVersionCheck } = options;

    const schema = getSchema(item);

    const req: Delete = {
      TableName: getTableName(item),
      Key: marshallKey(schema, item),
    };

    if (!skipVersionCheck) {
      for (const prop of Object.keys(schema)) {
        const inputMember = item[prop];
        const fieldSchema = schema[prop];

        if (isVersionAttribute(fieldSchema) && inputMember !== undefined) {
          const { condition: versionCondition } = handleVersionAttribute(prop, inputMember);

          condition = condition ? { type: "And", conditions: [condition, versionCondition] } : versionCondition;
        }
      }
    }

    if (condition) {
      const attributes = new ExpressionAttributes();
      req.ConditionExpression = marshallConditionExpression(condition, schema, attributes).expression;

      if (Object.keys(attributes.names).length > 0) {
        req.ExpressionAttributeNames = attributes.names;
      }

      if (Object.keys(attributes.values).length > 0) {
        req.ExpressionAttributeValues = attributes.values;
      }
    }
    return req;
  }
}

//private methods copied from Dynamo Data Mapper, https://github.com/awslabs/dynamodb-data-mapper-js/blob/master/packages/dynamodb-data-mapper/src/DataMapper.ts
function getTableName(item: any, tableNamePrefix = ""): string {
  if (item) {
    const tableName = item[DynamoDbTable];
    if (typeof tableName === "string") {
      return tableNamePrefix + tableName;
    }
  }

  throw new Error(
    "The provided item did not adhere to the DynamoDbTable protocol. No" +
      " string property was found at the `DynamoDbTable` symbol",
  );
}

function handleVersionAttribute(
  attributeName: string,
  inputMember: any,
): {
  condition: ConditionExpression;
  value: MathematicalExpression | AttributeValue;
} {
  let condition: ConditionExpression;
  let value: any;
  if (inputMember === undefined) {
    condition = new FunctionExpression(
      "attribute_not_exists",
      new AttributePath([{ type: "AttributeName", name: attributeName } as PathElement]),
    );
    value = new AttributeValue({ N: "0" });
  } else {
    condition = {
      type: "Equals",
      subject: attributeName,
      object: inputMember,
    };
    value = new MathematicalExpression(new AttributePath(attributeName), "+", 1);
  }

  return { condition, value };
}

function isVersionAttribute(fieldSchema: SchemaType): boolean {
  return fieldSchema.type === "Number" && Boolean(fieldSchema.versionAttribute);
}
