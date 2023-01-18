import { OrderFailedNotificationParameters } from "../domain/TransactionNotificationParameters";

export class SendOrderFailedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly nobaUserID?: string;
  public readonly locale?: string;

  public readonly params: OrderFailedNotificationParameters;

  constructor({ email, firstName, lastName, nobaUserID, locale, params }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.nobaUserID = nobaUserID;
    this.locale = locale;

    this.params = params;
  }
}
