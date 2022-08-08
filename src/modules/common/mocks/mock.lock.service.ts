import { anyString, mock, when } from "ts-mockito";
import { LockService } from "../lock.service";

export function getMockLockServiceWithDefaults(): LockService {
  const mockLockService = mock(LockService);
  when(mockLockService.acquireLockForKey(anyString(), anyString())).thenReject(new Error("Method not implemented"));
  when(mockLockService.releaseLockForKey(anyString(), anyString())).thenReject(new Error("Method not implemented"));
  return mockLockService;
}
