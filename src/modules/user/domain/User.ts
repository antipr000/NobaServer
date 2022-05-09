import {AggregateRoot} from '../../../core/domain/AggregateRoot';
import {  VersioningInfo, versioningInfoJoiSchemaKeys } from '../../../core/domain/Entity';
import { KeysRequired } from '../../common/domain/Types';
import * as Joi from 'joi';
import { Entity } from '../../../core/domain/Entity';
import { DOB } from '../../../externalclients/idvproviders/definitions';
import { Address } from './Address';

export interface UserProps extends VersioningInfo {
    _id: string,
    name?: string,
    email: string,
    stripeCustomerID?: string, 
    phone?: string,
    isAdmin?: boolean,
    idVerified?: boolean,
    documentVerified?: boolean,
    documentVerificationTransactionId?: string;
    idVerificationTimestamp?: number;
    documentVerificationTimestamp?: number;
    dateOfBirth?: DOB;
    address?: Address;
}
// TODO: Schema should have required keys, object should be optional
const dobValidationJoiKeys: KeysRequired<DOB> = {
    date:  Joi.number().optional(),
    month: Joi.number().optional(),
    year: Joi.number().optional()
};

const addressValidationJoiKeys: KeysRequired<Address> = {
    streetName: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    countryCode: Joi.string().optional(),
    postalCode: Joi.string().optional()
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
    documentVerified: Joi.boolean().default(false),
    documentVerificationTransactionId: Joi.string().optional(),
    idVerificationTimestamp: Joi.number().optional(),
    documentVerificationTimestamp: Joi.number().optional(),
    dateOfBirth: Joi.object().keys(dobValidationJoiKeys).optional(),
    address: Joi.object().keys(addressValidationJoiKeys).optional()
}

export const userJoiSchema = Joi.object(userJoiValidationKeys).options({allowUnknown: true, stripUnknown: false}); 

export class User extends AggregateRoot<UserProps>​​ {

    private constructor (  userProps: UserProps ) { 
        super( userProps ); 
    }

    public static createUser(userProps: Partial<UserProps>): User{ //set email verified to true when user authenticates via third party and not purely via email
        if(!userProps._id) userProps._id = Entity.getNewID();
        const user = new User(Joi.attempt(userProps,userJoiSchema));
        return user;
    }
    
}
