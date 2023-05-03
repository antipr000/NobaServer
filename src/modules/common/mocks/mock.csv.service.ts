import { anything, mock, when } from "ts-mockito";
import { CsvService } from "../csv.service";

export function getMockCsvServiceWithDefaults() {
  const mockService = mock(CsvService);

  when(mockService.getHeadersFromCsvFile(anything())).thenReject(new Error("Method not implemented"));

  return mockService;
}
