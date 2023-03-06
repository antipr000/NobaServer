export class SendUpdateEmployeeAllocationAmontEvent {
  public readonly nobaEmployeeID: string;
  public readonly allocationAmountInPesos: number;

  constructor({
    nobaEmployeeID,
    allocationAmountInPesos,
  }: {
    nobaEmployeeID: string;
    allocationAmountInPesos: number;
  }) {
    this.nobaEmployeeID = nobaEmployeeID;
    this.allocationAmountInPesos = allocationAmountInPesos;
  }
}
