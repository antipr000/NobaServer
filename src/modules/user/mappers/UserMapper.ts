
import { User, UserProps } from '../domain/User';
import { UserDTO } from '../dto/UserDTO';
import { CrudOptions, getProps, toDDBModelInstance } from '../../../infra/dynamodb/DDBUtils';
import { UserModel } from '../../../infra/dynamodb/UserModel';
import { Mapper } from '../../../core/infra/Mapper';


export type UserMinPropertySetForDBLookUp = Pick<UserProps, "_id">

export class UserMapper implements Mapper<User> {
    public toPersistence(raw: UserMinPropertySetForDBLookUp | User , options: CrudOptions): UserModel{
        throw new Error("Method not implemented");
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
            phone: p.phone,
            idVerified: p.idVerified,
            documentVerified: p.documentVerified,
            dateOfBirth: p.dateOfBirth,
            address: p.address
        };        
    }

}

