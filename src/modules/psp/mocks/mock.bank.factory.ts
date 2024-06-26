import { anyString, mock, when } from "ts-mockito";
import { BankFactory } from "../factory/bank.factory";

export function getMockBankFactoryWithDefaults(): BankFactory {
  const factory = mock(BankFactory);
  when(factory.getBankImplementationByCurrency(anyString())).thenThrow(new Error("Not implemented!"));
  return factory;
}
