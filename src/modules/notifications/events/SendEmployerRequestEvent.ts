import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { BaseEvent } from "./BaseEvent";

export class SendEmployerRequestEvent extends BaseEvent {}

export const validateSendEmployerRequestEvent = (event: SendEmployerRequestEvent) => {
  const sendEmployerRequestEventJoiValidationKeys: KeysRequired<SendEmployerRequestEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    locale: Joi.string().optional(),
    phone: Joi.string().optional(),
    handle: Joi.string().optional(),
    nobaUserID: Joi.string().optional(),
  };

  const sendEmployerRequestEventJoiSchema = Joi.object(sendEmployerRequestEventJoiValidationKeys);

  Joi.attempt(event, sendEmployerRequestEventJoiSchema);
};
