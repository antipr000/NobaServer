import {AggregateRoot} from '../../../core/domain/AggregateRoot';
import {  VersioningInfo, versioningInfoJoiSchemaKeys } from '../../../core/domain/Entity';
import { KeysRequired } from '../../common/domain/Types';
import * as Joi from 'joi';
import { Entity } from '../../../core/domain/Entity';


export interface AdminProps extends VersioningInfo {
    _id: string,
    name: string,
    email: string,
    privileges: string
};

export const AdminKeys : KeysRequired<AdminProps> = {
    ...versioningInfoJoiSchemaKeys,
    _id: Joi.string().min(10).required(),
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().allow(null).optional().meta({ _mongoose: { index: true } }),
    privileges: Joi.string().default("READ_ONLY")
}

export const adminSchema = Joi.object(AdminKeys).options({allowUnknown: true, stripUnknown: false, }); 

export class Admin extends AggregateRoot<AdminProps>​​ {

    private constructor (  adminProps: AdminProps ) { 
        super( adminProps ); 
    }

    public static createAdmin(adminProps: Partial<AdminProps>): Admin{ 
        if(!adminProps._id) adminProps._id = Entity.getNewID();
        return new Admin(Joi.attempt(adminProps, adminSchema));
    }
    
}
