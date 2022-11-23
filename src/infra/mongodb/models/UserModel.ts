//TODO create models fromo Joi Schemas using joigoose? the risk is that if someone changes joischema the db schema changes automatically and previously saved models will break, if we keep the db schema separate from the joi schema
// the db schema will break at run time if new joischema isn't compatible with old schema? but what if some dev changes the db schema and they aren't aware that it will break old models?
import { Schema, model, Model } from "mongoose";
import Mongoose from "mongoose";
import Joigoose from "joigoose";
import { consumerJoiSchema, ConsumerProps } from "../../../modules/consumer/domain/Consumer";

const joigoose = Joigoose(Mongoose, null, {});

// A unique 'index' would prevent inserting 2 records with same 'handle'.
const mongooseConsumerSchema = new Schema(joigoose.convert(consumerJoiSchema), {
  timestamps: {
    createdAt: "createdTimestamp",
    updatedAt: "updatedTimestamp",
  },
}).index({ handle: 1 }, { unique: true });

export const CONSUMER_MODEL_NAME = "Consumer";

export const UserModel: Model<ConsumerProps> = model<ConsumerProps>(CONSUMER_MODEL_NAME, mongooseConsumerSchema);
