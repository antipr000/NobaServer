import { TransferReceivedNotificationParameters } from "../domain/TransactionNotificationParameters";

export class SendTransferReceivedEvent {
  public readonly email: string;
  public readonly name: string;
  public readonly handle: string;
  public readonly params: TransferReceivedNotificationParameters;
  public readonly locale?: string;

  constructor({ email, name, handle, params, locale }) {
    this.email = email;
    this.name = name;
    this.handle = handle;
    this.params = params;
    this.locale = locale;
  }
}
