import * as Joi from "joi";
import { KeysRequired } from "src/modules/common/domain/Types";


export interface StripeConfigs {
    secretKey: string
}

export const stripeConfigsJoiValidationSchema: KeysRequired<StripeConfigs> = {
    secretKey: Joi.string().required(),
}