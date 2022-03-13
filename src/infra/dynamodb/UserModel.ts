import {DynamoDbSchema, DynamoDbTable} from '@aws/dynamodb-data-mapper';
import {DynamoDBModel} from './DynamoBaseDefinitions';
import { joiToDDBSchema } from './DDBUtils';
import { userJoiValidationKeys } from '../../modules/user/domain/User';
import { usersTableBaseSchema,  UsersTableMeta } from './UsersTable';

/** IF ADDING ANY NEW GSI CONSUMER PLEASE ADD IT IN GLOBAL STATIC REGISTRY SO THAT SOME VALIDATION CHECKS CAN BE PERFORMED DURING CREATING TABLES,
 *  SEE validatetables.ts in scripts folder*/


const userModelName = "UserModel";

const UserModelTable = UsersTableMeta;


const schema = {
    ...joiToDDBSchema(userJoiValidationKeys),
	...usersTableBaseSchema //Base schema shouldn't be overriden by model level schema
}; 

class UserModel extends DynamoDBModel {

}

UserModel.table = UserModelTable;
UserModel.prototype[DynamoDbTable] = UserModelTable.tableName;
UserModel.prototype[DynamoDbSchema] = schema 

export {
    UserModel
}
