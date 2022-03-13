import {
  DDB_KEY_TYPE,
  HASH_KEY_TYPE,
  RANGE_KEY_TYPE,
  VERSION_ATTRIBUTE,
} from "./DDBUtils";

export const LookupTableMeta = {
  tableName: "Lookup",
  partitionKeyAttribute: "pk",
  sortKeyAttribute: "sk",
  description:
    "General purpose table, can be used for storing any type of model (preffered transient data, i.e. not so important, like storing OTPs etc.)",
} as const;


export const lookUpTableBaseSchema = {
  pk: {
    type: "String",
    [DDB_KEY_TYPE]: HASH_KEY_TYPE,
  },
  sk: {
    type: "String",
    [DDB_KEY_TYPE]: RANGE_KEY_TYPE,
  },
  version: {
    type: "Number",
    [VERSION_ATTRIBUTE]: true,
  },
};
