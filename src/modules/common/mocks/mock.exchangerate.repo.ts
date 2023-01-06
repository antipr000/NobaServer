import { anyString, anything, mock, when } from "ts-mockito";
import { IExchangeRateRepo } from "../repo/exchangerate.repo";
import { SQLExchangeRateRepo } from "../repo/sql.exchangerate.repo";

export function getMockExchangeRateRepoWithDefaults(): IExchangeRateRepo {
  const mockExchangeRateRepo = mock(SQLExchangeRateRepo);
  when(mockExchangeRateRepo.createExchangeRate(anything())).thenReject(new Error("Not implemented"));
  when(mockExchangeRateRepo.getExchangeRateForCurrencyPair(anyString(), anyString())).thenReject(
    new Error("Not implemented"),
  );
  return mockExchangeRateRepo;
}
