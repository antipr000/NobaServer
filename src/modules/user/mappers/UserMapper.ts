
import { User, UserProps } from '../domain/User';
import { UserDTO } from '../dto/UserDTO';
import { CrudOptions, getProps, toDDBModelInstance } from '../../../infra/dynamodb/DDBUtils';
import { UserModel } from '../../../infra/dynamodb/UserModel';
import { Mapper } from '../../../core/infra/Mapper';


export type UserMinPropertySetForDBLookUp = Pick<UserProps, "_id">

export class UserMapper implements Mapper<User> {
    public toPersistence(raw: UserMinPropertySetForDBLookUp | User , options: CrudOptions): UserModel{
        const lookupProps =  getProps(raw);
        const model =  toDDBModelInstance(raw, UserModel, options);
        model[UserModel.table.partitionKeyAttribute] = lookupProps._id; 
        model[UserModel.table.sortKeyAttribute] = this.getDDBSortKey();
        return model; 
    }

    public toDomain(raw: any): User{ 
        return User.createUser(raw);
    }

    public toDTO(user: User): UserDTO{
        const p = user.props; 
        return {
            _id: p._id,
            version: p.version,
            name: p.name,
            email: p.email,
            isEmailVerified: p.isEmailVerified,
            idVerified: p.idVerified,
            documentVerified: p.documentVerified
        };        
    }

    public getDDBSortKey(): string{
        return "User"
    }

}

