import { Address } from "../../consumer/domain/Address";
import { NationalIDTypes } from "./NationalIDTypes";

export type NationalID = {
  type: NationalIDTypes;
  number: string;
};

export enum KYCFlow {
  LOGIN = "login",
  CUSTOMER = "customer",
}

export type ConsumerInformation = {
  userID: string;
  createdTimestampMillis?: number;
  firstName: string;
  lastName: string;
  address: Address;
  phoneNumber?: string;
  dateOfBirth: string;
  nationalID?: NationalID;
  email?: string;
};
