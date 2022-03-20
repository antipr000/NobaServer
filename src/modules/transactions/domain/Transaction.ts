import {AggregateRoot} from '../../../core/domain/AggregateRoot';
import {  Entity, VersioningInfo, versioningInfoJoiSchemaKeys } from '../../../core/domain/Entity';
import { KeysRequired } from '../../common/domain/Types';
import * as Joi from 'joi';
import { TransactionStatus } from './Types';

export interface TransactionProps extends VersioningInfo {
    id: string,
    userId: string,
    stripePaymentID?: string,
    leg1Amount: number,
    leg2Amount: number,
    leg1: string,
    leg2: string,
    diagnosis?: string,
    cryptoTransactionID?: string,
    transactionStatus: TransactionStatus,
}


export const transactionJoiValidationKeys : KeysRequired<TransactionProps> = {
    ...versioningInfoJoiSchemaKeys,
    id: Joi.string().min(10).required(),
    userId: Joi.string().required(),
    transactionStatus: Joi.string().valid(...Object.values(TransactionStatus)).required(),
    leg1Amount: Joi.number().required(),
    leg2Amount: Joi.number().required(),
    leg1: Joi.string().required(),
    leg2: Joi.string().required(),
    diagnosis: Joi.string().optional(),
    stripePaymentID: Joi.string().optional(),
    cryptoTransactionID: Joi.string().optional(),
}

export const transactionJoiSchema = Joi.object(transactionJoiValidationKeys).options({stripUnknown: true}); 

export class Transaction extends AggregateRoot<TransactionProps>​​ {

    private constructor (  transactionProps: TransactionProps ) { 
        super( transactionProps ); 
    }

    public static createTransaction(transactionProps: Partial<TransactionProps>): Transaction{ //set email verified to true when user authenticates via third party and not purely via email
        transactionProps.id = transactionProps.id ?? "transaction_"+Entity.getNewID();
        return new Transaction(Joi.attempt(transactionProps,transactionJoiSchema));
    }
    
}
