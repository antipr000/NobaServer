import { OrderFailedEmailParameters } from "../../../modules/common/domain/EmailParameters";

export class SendOrderFailedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly params: OrderFailedEmailParameters;

  constructor({ email, firstName, lastName, params }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.params = params;
  }
}
