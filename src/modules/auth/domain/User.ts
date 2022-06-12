import { UserProps } from "../../../modules/user/domain/User";

export class User implements UserProps {
  _id: string;
  name?: string;
  email?: string;
  stripeCustomerID?: string;
  phone?: string;
  isAdmin?: boolean;
  idVerified?: boolean;
  documentVerified?: boolean;
  documentVerificationTransactionId?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}
