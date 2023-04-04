import { TransferFailedNotificationParameters } from "../domain/TransactionNotificationParameters";

export class SendTransferFailedEvent {
  public readonly email: string;
  public readonly name: string;
  public readonly handle: string;
  public readonly pushTokens: string[];
  public readonly params: TransferFailedNotificationParameters;
  public readonly locale?: string;

  constructor({ email, name, handle, params, pushTokens, locale }) {
    this.email = email;
    this.name = name;
    this.handle = handle;
    this.params = params;
    this.pushTokens = pushTokens;
    this.locale = locale;
  }
}
