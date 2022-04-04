import { Result } from "../../../core/logic/Result";
import { UserModel } from "../../../infra/mongodb/models/UserModel";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { User, UserProps } from "../domain/User";
import { UserMapper } from "../mappers/UserMapper";
import { IUserRepo } from "./UserRepo";
 


//TODO figure out a way to create indices using joi schema and joigoose
export class MongoDBUserRepo implements IUserRepo {

   
    private readonly userMapper = new UserMapper();

    constructor( private readonly dbProvider: DBProvider) { 
     
    }

    async getUser(userID: string): Promise<User> {
       const  result : UserProps  = await  UserModel.findById(userID).exec();
       return this.userMapper.toDomain(result);
    }


    async batchGetUsers(userIds: string[]) {
       //TODO implement if needed 
    }

    
    async updateUser(user: User): Promise<User> {
        const userProps = await UserModel.findByIdAndUpdate(user.props._id, {
            $set: user.props
        }, {
            new: true
        }).exec(); 
        return this.userMapper.toDomain(userProps);
    }
    

    async getUserIfExists(email: string): Promise<Result<User>>{
       try {
           const user = await UserModel.findOne({ "email": email }).exec();
            return Result.ok(this.userMapper.toDomain(user));
       } catch(err) {
            return Result.fail("Couldn't find user in the db");
       }
    }

    async getUserByEmail(email:string): Promise<Result<User>> {
        return this.getUserIfExists(email);
    }

    async exists(email: string):Promise<boolean>{
        const res = await this.getUserIfExists(email);
        return res.isSuccess; 
    }

    async createUser(user: User) : Promise<User> {
        if(this.exists(user.props.email)) {
            throw Error("User with given email already exists");
        } else {
            const userProps = await UserModel.create(user.props);
            return this.userMapper.toDomain(userProps);
        }
    }

}