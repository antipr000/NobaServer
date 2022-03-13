import { DDB_KEY_TYPE,  HASH_KEY_TYPE, RANGE_KEY_TYPE, VERSION_ATTRIBUTE, TableMeta} from "./DDBUtils";


const usersTableIDAttr = "pk";
const usersTableSKAttr = "sk";


export const UsersTableMeta: TableMeta = {
	tableName: "Users",
	partitionKeyAttribute: usersTableIDAttr,
    sortKeyAttribute: usersTableSKAttr,
    description: "Table containing, users info, teams info, organizations info etc."
} as const;



export const usersTableBaseSchema  = {
    
    [usersTableIDAttr] : {
        type: "String",
        [DDB_KEY_TYPE]: HASH_KEY_TYPE
    },

    [usersTableSKAttr]: {
        type: "String",
        [DDB_KEY_TYPE]: RANGE_KEY_TYPE
    },

    version: {
        type: "Number",
        [VERSION_ATTRIBUTE]: true
    }
}