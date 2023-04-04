import { DepositFailedNotificationParameters } from "../domain/TransactionNotificationParameters";

export class SendDepositFailedEvent {
  public readonly email: string;
  public readonly name: string;
  public readonly handle: string;
  public readonly params: DepositFailedNotificationParameters;
  public readonly pushTokens: string[];
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
