import { TransferCompletedNotificationParameters } from "../domain/TransactionNotificationParameters";

export class SendTransferCompletedEvent {
  public readonly email: string;
  public readonly name: string;
  public readonly handle: string;
  public readonly params: TransferCompletedNotificationParameters;
  public readonly pushTokens: string[];
  public readonly locale?: string;

  constructor({ email, name, handle, params, pushTokens, locale }) {
    this.email = email;
    this.name = name;
    this.handle = handle;
    this.params = params;
    this.locale = locale;
    this.pushTokens = pushTokens;
  }
}
