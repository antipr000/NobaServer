import { TransactionEvent as PrismaTransactionEventModel } from "@prisma/client";
import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class InputTransactionEvent {
  transactionID: string;
  internal?: boolean = true;
  message: string;
  details?: string;
  key?: string;
  param1?: string;
  param2?: string;
  param3?: string;
  param4?: string;
  param5?: string;
}

export class TransactionEvent extends InputTransactionEvent {
  id: string;
  timestamp: Date;
}

export const validateInputTransactionEvent = (transactionEvent: InputTransactionEvent) => {
  const transactionEventJoiValidationKeys: KeysRequired<InputTransactionEvent> = {
    transactionID: Joi.string().required(),
    internal: Joi.boolean().optional().default(true),
    message: Joi.string().required(),
    details: Joi.string().optional(),
    key: Joi.string().optional(),
    param1: Joi.string().optional(),
    param2: Joi.string().optional(),
    param3: Joi.string().optional(),
    param4: Joi.string().optional(),
    param5: Joi.string().optional(),
  };

  const transactionEventJoiSchema = Joi.object(transactionEventJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transactionEvent, transactionEventJoiSchema);
};

export const validateSavedTransactionEvent = (transactionEvent: TransactionEvent) => {
  const transactionEventJoiValidationKeys: KeysRequired<TransactionEvent> = {
    id: Joi.string().required(),
    timestamp: Joi.date().required(),
    transactionID: Joi.string().required(),
    internal: Joi.boolean().required().default(true),
    message: Joi.string().required(),
    details: Joi.string().optional().allow(null),
    key: Joi.string().optional().allow(null),
    param1: Joi.string().optional().allow(null),
    param2: Joi.string().optional().allow(null),
    param3: Joi.string().optional().allow(null),
    param4: Joi.string().optional().allow(null),
    param5: Joi.string().optional().allow(null),
  };

  const transactionEventJoiSchema = Joi.object(transactionEventJoiValidationKeys).options({
    allowUnknown: false,
    stripUnknown: true,
  });
  Joi.attempt(transactionEvent, transactionEventJoiSchema);
};

export const convertToDomainTransactionEvent = (transactionEvent: PrismaTransactionEventModel): TransactionEvent => {
  const domainTransactionEvent: TransactionEvent = {
    id: transactionEvent.id,
    timestamp: transactionEvent.timestamp,
    transactionID: transactionEvent.transactionID,
    internal: transactionEvent.internal,
    message: transactionEvent.message,
    details: transactionEvent.details,
    key: transactionEvent.key,
    param1: transactionEvent.param1,
    param2: transactionEvent.param2,
    param3: transactionEvent.param3,
    param4: transactionEvent.param4,
    param5: transactionEvent.param5,
  };

  return domainTransactionEvent;
};
