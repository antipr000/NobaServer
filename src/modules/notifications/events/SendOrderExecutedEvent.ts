import { OrderExecutedNotificationParameters } from "../domain/TransactionNotificationParameters";

export class SendOrderExecutedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly nobaUserID?: string;
  public readonly partnerUserID?: string;
  public readonly params: OrderExecutedNotificationParameters;
  public readonly partnerID?: string;

  constructor({ email, firstName, lastName, nobaUserID, partnerUserID, params, partnerID }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.nobaUserID = nobaUserID;
    this.partnerUserID = partnerUserID;
    this.params = params;
    this.partnerID = partnerID;
  }
}
