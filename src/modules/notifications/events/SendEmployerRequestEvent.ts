import Joi from "joi";
import { KeysRequired } from "../../../modules/common/domain/Types";

export class SendEmployerRequestEvent {
  email: string;
  firstName: string;
  lastName?: string;
  locale?: string;
}

export const validateSendEmployerRequestEvent = (event: SendEmployerRequestEvent) => {
  const sendEmployerRequestEventJoiValidationKeys: KeysRequired<SendEmployerRequestEvent> = {
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().optional(),
    locale: Joi.string().optional(),
  };

  const sendEmployerRequestEventJoiSchema = Joi.object(sendEmployerRequestEventJoiValidationKeys);

  Joi.attempt(event, sendEmployerRequestEventJoiSchema);
};
