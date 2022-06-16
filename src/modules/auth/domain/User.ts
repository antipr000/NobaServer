import { UserProps } from "../../../modules/user/domain/User";
import { VerificationStatusType } from "../../../modules/user/domain/Types";

export class User implements UserProps {
  _id: string;
  name?: string;
  email?: string;
  stripeCustomerID?: string;
  phone?: string;
  isAdmin?: boolean;
  verificationStatus?: VerificationStatusType;
  documentVerified?: boolean;
  documentVerificationTransactionId?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}
