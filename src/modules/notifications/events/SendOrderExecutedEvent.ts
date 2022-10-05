import { OrderExecutedEmailParameters } from "../../../modules/common/domain/EmailParameters";

export class SendOrderExecutedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly params: OrderExecutedEmailParameters;

  constructor({ email, firstName, lastName, params }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.params = params;
  }
}
