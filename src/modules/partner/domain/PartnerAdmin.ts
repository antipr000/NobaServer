import {AggregateRoot} from '../../../core/domain/AggregateRoot';
import {  VersioningInfo, versioningInfoJoiSchemaKeys } from '../../../core/domain/Entity';
import { KeysRequired } from '../../common/domain/Types';
import * as Joi from 'joi';
import { Entity } from '../../../core/domain/Entity';


export interface PartnerAdminProps extends VersioningInfo {
    _id: string,
    name: string,
    email: string,
    partnerId: string,
    privileges: string
};

export const partnerAdminKeys : KeysRequired<PartnerAdminProps> = {
    ...versioningInfoJoiSchemaKeys,
    _id: Joi.string().min(10).required(),
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().allow(null).optional().meta({ _mongoose: { index: true } }),
    partnerId: Joi.string().required(),
    privileges: Joi.string().default("READ_ONLY")
}

export const partnerAdminSchema = Joi.object(partnerAdminKeys).options({allowUnknown: true, stripUnknown: false, }); 

export class PartnerAdmin extends AggregateRoot<PartnerAdminProps>​​ {

    private constructor (  partnerAdminProps: PartnerAdminProps ) { 
        super( partnerAdminProps ); 
    }

    public static createPartnerAdmin(partnerAdminProps: Partial<PartnerAdminProps>): PartnerAdmin{ 
        if(!partnerAdminProps._id) partnerAdminProps._id = Entity.getNewID();
        return new PartnerAdmin(Joi.attempt(partnerAdminProps, partnerAdminSchema));
    }
    
}
