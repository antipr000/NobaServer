import {AggregateRoot} from '../../../core/domain/AggregateRoot';
import {  VersioningInfo, versioningInfoJoiSchemaKeys } from '../../../core/domain/Entity';
import { KeysRequired } from '../../common/domain/Types';
import * as Joi from 'joi';
import { Entity } from '../../../core/domain/Entity';
import { KybStatusInfo } from './KybStatus';


export interface PartnerProps extends VersioningInfo {
    _id: string,
    name: string,
    publicKey: string,
    privateKey: string,
    verificationData?: KybStatusInfo,
    takeRate?: number
}

export const partnerKeys : KeysRequired<PartnerProps> = {
    ...versioningInfoJoiSchemaKeys,
    _id: Joi.string().min(10).required(),
    name: Joi.string().min(2).max(100).optional(),
    publicKey: Joi.string().required(),
    privateKey: Joi.string().required(),
    verificationData: Joi.object().optional(),
    takeRate: Joi.number().optional()
}

export const partnerSchema = Joi.object(partnerKeys).options({allowUnknown: true, stripUnknown: false, }); 

export class Partner extends AggregateRoot<PartnerProps>​​ {

    private constructor (  partnerProps: PartnerProps ) { 
        super( partnerProps ); 
    }

    public static createPartner(partnerProps: Partial<PartnerProps>): Partner{ 
        if(!partnerProps._id) partnerProps._id = Entity.getNewID();
        // assign public and private keys here
        return new Partner(Joi.attempt(partnerProps, partnerSchema));
    }
    
}
