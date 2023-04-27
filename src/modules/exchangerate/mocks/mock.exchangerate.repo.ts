import { SQLExchangeRateRepo } from "../../../modules/exchangerate/repo/sql.exchangerate.repo";
import { IExchangeRateRepo } from "../../../modules/exchangerate/repo/exchangerate.repo";
import { anyString, anything, mock, when } from "ts-mockito";

export function getMockExchangeRateRepoWithDefaults(): IExchangeRateRepo {
  const mockExchangeRateRepo = mock(SQLExchangeRateRepo);
  when(mockExchangeRateRepo.createExchangeRate(anything())).thenReject(new Error("Not implemented"));
  when(mockExchangeRateRepo.getExchangeRateForCurrencyPair(anyString(), anyString(), anything())).thenReject(
    new Error("Not implemented"),
  );
  return mockExchangeRateRepo;
}
