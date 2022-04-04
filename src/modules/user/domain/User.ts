import {AggregateRoot} from '../../../core/domain/AggregateRoot';
import {  VersioningInfo, versioningInfoJoiSchemaKeys } from '../../../core/domain/Entity';
import { KeysRequired } from '../../common/domain/Types';
import * as Joi from 'joi';
import { Entity } from '../../../core/domain/Entity';

export interface UserProps extends VersioningInfo {
    _id: string,
    name?: string,
    email: string,
    stripeCustomerID?: string, 
    phone?: string,
    isAdmin?: boolean,
    idVerified?: boolean,
    documentVerified?: boolean
}


export const userJoiValidationKeys : KeysRequired<UserProps> = {
    ...versioningInfoJoiSchemaKeys,
    _id: Joi.string().min(10).required(),
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().required().meta({ _mongoose: { index: true } }), 
    stripeCustomerID: Joi.string().optional(),
    phone: Joi.string().optional(), //TODO phone number validation, how do we want to store phone number? country code + phone number?
    isAdmin: Joi.boolean().default(false),
    idVerified: Joi.boolean().default(false),
    documentVerified: Joi.boolean().default(false)
}

export const userJoiSchema = Joi.object(userJoiValidationKeys).options({allowUnknown: true}); 

export class User extends AggregateRoot<UserProps>​​ {

    private constructor (  userProps: UserProps ) { 
        super( userProps ); 
    }

    public static createUser(userProps: Partial<UserProps>): User{ //set email verified to true when user authenticates via third party and not purely via email
        if(!userProps._id) userProps._id = Entity.getNewID();
        return new User(Joi.attempt(userProps,userJoiSchema));
    }
    
}
