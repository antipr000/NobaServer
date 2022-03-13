import {AggregateRoot} from '../../../core/domain/AggregateRoot';
import {  VersioningInfo, versioningInfoJoiSchemaKeys } from '../../../core/domain/Entity';
import { KeysRequired } from '../../common/domain/Types';
import * as Joi from 'joi';

export interface UserProps extends VersioningInfo {
    //TODO create self link with 'a-z', '0-9', '-', or '_'
    id: string,
    name?: string,
    email: string,
    isEmailVerified?: boolean, 
}


export const userJoiValidationKeys : KeysRequired<UserProps> = {
    ...versioningInfoJoiSchemaKeys,
    id: Joi.string().min(10).required(),
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().required(),
    isEmailVerified: Joi.boolean().default(false), 
}

export const userJoiSchema = Joi.object(userJoiValidationKeys).options({stripUnknown: true}); 

export class User extends AggregateRoot<UserProps>​​ {

    private constructor (  userProps: UserProps ) { 
        super( userProps ); 
    }

    public static createUser(userProps: Partial<UserProps>): User{ //set email verified to true when user authenticates via third party and not purely via email
        if(!userProps.id) userProps.id = userProps.email;
        return new User(Joi.attempt(userProps,userJoiSchema));
    }
    
}
