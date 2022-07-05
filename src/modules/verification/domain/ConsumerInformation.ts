import { Address } from "../../consumer/domain/Address";
import { NationalIDTypes } from "./NationalIDTypes";

export type NationalID = {
  type: NationalIDTypes;
  number: string;
};

export type ConsumerInformation = {
  userID: string;
  firstName: string;
  lastName: string;
  address: Address;
  phoneNumber: string;
  dateOfBirth: string;
  nationalID?: NationalID;
  email: string;
};
