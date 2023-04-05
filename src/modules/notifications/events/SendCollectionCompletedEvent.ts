export class SendCollectionCompletedEvent {
  public readonly debitAmount: number;
  public readonly debitCurrency: string;
  public readonly pushTokens: string[];
  public readonly locale?: string;

  constructor({ debitAmount, debitCurrency, pushTokens, locale }) {
    this.debitAmount = debitAmount;
    this.debitCurrency = debitCurrency;
    this.locale = locale;
    this.pushTokens = pushTokens;
  }
}
