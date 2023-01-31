import { anyString, anything, mock, when } from "ts-mockito";
import { SQLPushTokenRepo } from "../repos/sql.pushtoken.repo";

export function getMockPushTokenRepoWithDefaults() {
  const pushTokenRepo = mock(SQLPushTokenRepo);
  when(pushTokenRepo.getPushToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  when(pushTokenRepo.addPushToken(anyString(), anyString())).thenReject(new Error("Not implemented!"));
  return pushTokenRepo;
}
