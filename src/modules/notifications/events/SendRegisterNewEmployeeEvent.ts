export class SendRegisterNewEmployeeEvent {
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly email: string;
  public readonly phone: string;
  public readonly employerReferralID: string;
  public readonly allocationAmountInPesos: number;
  public readonly nobaEmployeeID: string;

  constructor({
    firstName,
    lastName,
    email,
    phone,
    employerReferralID,
    allocationAmountInPesos,
    nobaEmployeeID,
  }: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employerReferralID: string;
    allocationAmountInPesos: number;
    nobaEmployeeID: string;
  }) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.employerReferralID = employerReferralID;
    this.allocationAmountInPesos = allocationAmountInPesos;
    this.nobaEmployeeID = nobaEmployeeID;
  }
}
