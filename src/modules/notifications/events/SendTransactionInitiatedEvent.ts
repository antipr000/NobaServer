import { TransactionInitiatedEmailParameters } from "../../../modules/common/domain/EmailParameters";

export class SendTransactionInitiatedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly params: TransactionInitiatedEmailParameters;

  constructor({ email, firstName, lastName, params }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.params = params;
  }
}
