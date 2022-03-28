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
        const userProps = await UserModel.findByIdAndUpdate(user.props._id, user.props).exec(); 
        return this.userMapper.toDomain(userProps);
    }
    

    async getUserIfExists(id: string): Promise<Result<User>>{
       try {
           const user = await this.getUser(id);
            return Result.ok(user);
       } catch(err) {
            return Result.fail("Couldn't find user in the db");
       }
    }

    async getUserByEmail(email:string): Promise<Result<User>> {
        return this.getUserIfExists(email);
    }

    async exists(id: string):Promise<boolean>{
        const res = await this.getUserIfExists(id);
        return res.isSuccess; 
    }

    async createUser(user: User) : Promise<User> {
        const userProps = await UserModel.create(user.props);
        return this.userMapper.toDomain(userProps);
    }

}