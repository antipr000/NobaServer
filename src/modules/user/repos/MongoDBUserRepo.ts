import { Result } from "../../../core/logic/Result";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { User, UserProps } from "../domain/User";
import { UserMapper } from "../mappers/UserMapper";
import { IUserRepo } from "./UserRepo";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
 


//TODO figure out a way to create indices using joi schema and joigoose
export class MongoDBUserRepo implements IUserRepo {

   
    private readonly userMapper = new UserMapper();

    constructor( private readonly dbProvider: DBProvider) { 
     
    }
    

    async getUser(userID: string): Promise<User> {
       const  result :any  = await  this.dbProvider.userModel.findById(userID).exec();
       const userData: UserProps = convertDBResponseToJsObject(result);
       return this.userMapper.toDomain(userData);
    }


    async batchGetUsers(userIds: string[]) {
       //TODO implement if needed 
    }

    
    async updateUser(user: User): Promise<User> {
        const result = await this.dbProvider.userModel.findByIdAndUpdate(user.props._id, {
            $set: user.props
        }, {
            new: true
        }).exec(); 
        const userProps: UserProps = convertDBResponseToJsObject(result);
        return this.userMapper.toDomain(userProps);
    }
    

    async getUserIfExists(email: string): Promise<Result<User>>{
       try {
           const result = await this.dbProvider.userModel.findOne({ "email": email }).exec();
           if(result) {
            const user: UserProps = convertDBResponseToJsObject(result);
            return Result.ok(this.userMapper.toDomain(user));
           } else {
            return Result.fail("Couldn't find user in the db"); 
           }
       } catch(err) {
            return Result.fail("Couldn't find user in the db");
       }
    }

    async getUserByEmail(email:string): Promise<Result<User>> {
        return this.getUserIfExists(email);
    }

    async getUserByPhone(phone: string): Promise<Result<User>> {
        try {
            const result = await this.dbProvider.userModel.findOne({ "phone": phone}).exec();
            if(result) {
             const user: UserProps = convertDBResponseToJsObject(result);
             return Result.ok(this.userMapper.toDomain(user));
            } else {
             return Result.fail("Couldn't find user in the db"); 
            }
        } catch(err) {
             return Result.fail("Couldn't find user in the db");
        };
    }

    async exists(email: string):Promise<boolean>{
        const res = await this.getUserIfExists(email);
        return res.isSuccess;
    }

    async createUser(user: User) : Promise<User> {
        if(await this.exists(user.props.email)) {
            throw Error("User with given email already exists");
        } else {
            const result = await this.dbProvider.userModel.create(user.props);
            const userProps: UserProps = convertDBResponseToJsObject(result);
            return this.userMapper.toDomain(userProps);
        }
    }

}