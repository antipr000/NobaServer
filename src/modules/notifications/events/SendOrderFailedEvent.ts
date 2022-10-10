import { OrderFailedEmailParameters } from "../../../modules/common/domain/EmailParameters";

export class SendOrderFailedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly params: OrderFailedEmailParameters;
  public readonly partnerId?: string;

  constructor({ email, firstName, lastName, params, partnerId }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.params = params;
    this.partnerId = partnerId;
  }
}
