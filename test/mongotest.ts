import { Schema, model, Model } from "mongoose";
import * as Mongoose from "mongoose";
import * as Joigoose from "joigoose";

import * as Joi from "joi";

const joigoose = Joigoose(Mongoose, null , {});

const userJoiSchema = Joi.object({name: Joi.string().required(), _id: Joi.string().required()});

type UserProps = {
    _id: string,
    name: string;
}

const mongooseUserSchema = new Schema(joigoose.convert(userJoiSchema));

const mongoUri =  `mongodb+srv://nobamongo:NobaMongo@cluster0.wjsia.mongodb.net/devdb`;

Mongoose.connect(mongoUri, {serverSelectionTimeoutMS: 2000});

const db = Mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("connection opened");
});


export const UserModel: Model<UserProps> = model<UserProps>("User", mongooseUserSchema);

// UserModel.create({name: "testuser", _id: "testuser134"});
UserModel.findById("testuser134", (err, user) => {
    console.log(user);
    console.log(err);
 });
