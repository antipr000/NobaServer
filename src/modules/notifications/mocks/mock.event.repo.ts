import { anyString, mock, when } from "ts-mockito";
import { EventRepo } from "../repos/event.repo";
import { SQLEventRepo } from "../repos/sql.event.repo";

export function getMockEventRepoWithDefaults(): EventRepo {
  const mockEventRepo = mock(SQLEventRepo);

  when(mockEventRepo.getEventByName(anyString())).thenReject(new Error("Not implemented."));
  when(mockEventRepo.getEventByID(anyString())).thenReject(new Error("Not implemented."));

  return mockEventRepo;
}
