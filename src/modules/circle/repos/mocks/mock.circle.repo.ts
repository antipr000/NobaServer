import { anyString, anything, mock, when } from "ts-mockito";
import { SQLCircleRepo } from "../sql.circle.repo";
import { ICircleRepo } from "../circle.repo";

export function getMockCircleRepoWithDefaults(): ICircleRepo {
  const mockCircleRepo: ICircleRepo = mock(SQLCircleRepo);

  when(mockCircleRepo.addConsumerCircleWalletID(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockCircleRepo.getCircleWalletID(anyString())).thenReject(new Error("Method not implemented"));
  when(mockCircleRepo.updateCurrentBalance(anyString(), anything())).thenReject(new Error("Method not implemented"));
  when(mockCircleRepo.getCircleBalance(anyString())).thenReject(new Error("Method not implemented"));
  return mockCircleRepo;
}
