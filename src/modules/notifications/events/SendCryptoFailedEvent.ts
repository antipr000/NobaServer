import { CryptoFailedEmailParameters } from "../../../modules/common/domain/EmailParameters";

export class SendCryptoFailedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly params: CryptoFailedEmailParameters;

  constructor({ email, firstName, lastName, params }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.params = params;
  }
}
