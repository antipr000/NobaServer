import { anything, mock, when } from "ts-mockito";
import { BankMonoImpl } from "../factory/bank.mono.impl";
export function getMockBankMonoImplWithDefaults(): BankMonoImpl {
  const bankMonoImpl = mock(BankMonoImpl);
  when(bankMonoImpl.debit(anything())).thenReject(new Error("Not implemented!"));
  return bankMonoImpl;
}
