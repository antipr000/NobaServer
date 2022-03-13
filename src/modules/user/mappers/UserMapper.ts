
import { User, UserProps } from '../domain/User';
import { UserDTO } from '../dto/UserDTO';
import { CrudOptions, getProps, toDDBModelInstance,  unwrapDDBItem } from '../../../infra/dynamodb/DDBUtils';
import { UserModel } from 'src/infra/dynamodb/UserModel';
import { Mapper } from '../../../core/infra/Mapper';
import { UsersTableMeta } from 'src/infra/dynamodb/UsersTable';


export type UserMinPropertySetForDBLookUp = Pick<UserProps, "id">

export class UserMapper implements Mapper<User> {
    public toPersistence(raw: UserMinPropertySetForDBLookUp | User , options: CrudOptions): UserModel{
        const lookupProps =  getProps(raw);
        const model =  toDDBModelInstance(raw, UserModel, options);
        model[UserModel.table.partitionKeyAttribute] = lookupProps.id; 
        model[UserModel.table.sortKeyAttribute] = this.getDDBSortKey();
        return model; 
    }

    public toDomain(raw: any): User{ 
        delete raw[UsersTableMeta.sortKeyAttribute]; // sortkey attribute is not part of user domain model 

        return User.createUser(unwrapDDBItem(raw));
    }

    public toDTO(user: User): UserDTO{
        const p = user.props; 
        return {
            id: p.id,
            version: p.version,
            name: p.name,
            email: p.email,
        }        
    }

    public getDDBSortKey(): string{
        return "User"
    }

}

