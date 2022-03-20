import { Repo } from "../../../core/infra/Repo";
import { User} from '../domain/User'; 
import { UserMapper } from '../mappers/UserMapper'; 
import { Result } from '../../../core/logic/Result';
import { isDynamoDBItemNotFoundException } from '../../../core/utils/Utils';
import { DyanamoDataMapperExtended } from '../../../infra/dynamodb/DDBDataMapperExtended';
import { getAllItems } from '../../../infra/dynamodb/DDBUtils';
import { BadRequestError} from '../../../core/exception/CommonAppException';
import { DBProvider } from "src/infraproviders/DBProvider";


export interface IUserRepo extends Repo<User> {
    getUser(userID: string): Promise<User>
    createUser(user: User): Promise<User> 
    getUserIfExists(id: string): Promise<Result<User>>
    exists(id: string): Promise<boolean>
    getUserByEmail(email:string): Promise<Result<User>>
    updateUser(user: User): Promise<User>   
}

export class DyanamoDBUserRepo implements IUserRepo {

    private readonly dynamoMapper: DyanamoDataMapperExtended; 
    private readonly userMapper: UserMapper; 


    constructor( private readonly dbProvider: DBProvider) { 
        this.dynamoMapper = dbProvider.dynamoDataMapper,
        this.userMapper = new UserMapper(); 
    }

    async getUser(userID: string): Promise<User> {
        const userModel = this.userMapper.toPersistence({id: userID}, { isReading: true }); 
        const dbResp = await this.dynamoMapper.get(userModel); //Todo handle failures
        return this.userMapper.toDomain(dbResp);
    }


    async batchGetUsers(userIds: string[]) {
       const userIterator =  this.dynamoMapper.batchGet(userIds.map(id=>this.userMapper.toPersistence({id},{isReading:true}))); 
       const userDBItems = await getAllItems(userIterator); 
    //    console.log(userDBItems);
       return userDBItems.map(item => this.userMapper.toDomain(item)); 
    }

    
    async updateUser(user: User): Promise<User> {
        const userModel = this.userMapper.toPersistence(user, { isUpdating: true }); 
        const dbResp = await this.dynamoMapper.update(userModel);
        return this.userMapper.toDomain(dbResp); 
    }
    

    async getUserIfExists(id: string): Promise<Result<User>>{
        //TODO if user is not found, return Deleted user props so that there are no breaks in the app because of deleted user
        const res: Result<User> = await this.getUser(id)
            .then(x=> {if(x) return Result.ok(x)})
            .catch(err => {
                if(isDynamoDBItemNotFoundException(err)) return Result.fail("Item not found with given id:"+id) ;
                else throw err; 
            });
        return res; 
    }

    async getUserByEmail(email:string): Promise<Result<User>> {
        return this.getUserIfExists(email);
    }

    async exists(id: string):Promise<boolean>{
        const res = await this.getUserIfExists(id);
        return res.isSuccess; 
    }

    async createUser(user: User) : Promise<User> {
        
        const existingUserDetails = await this.getUserIfExists(user.props.email);

        if (existingUserDetails.isSuccess) { 
            throw new BadRequestError({messageForClient: "User with email already exists"});
        }

        const userModel = this.userMapper.toPersistence(user,{isCreating: true});
      
        await this.dynamoMapper.put(userModel);

        return user; 
    }

}