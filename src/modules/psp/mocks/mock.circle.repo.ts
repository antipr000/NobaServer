import { anyString, anything, mock, when } from "ts-mockito";
import { SQLCircleRepo } from "../repos/sql.circle.repo";
import { ICircleRepo } from "../repos/circle.repo";

export function getMockCircleRepoWithDefaults(): ICircleRepo {
  const mockCircleRepo: ICircleRepo = mock(SQLCircleRepo);

  when(mockCircleRepo.addConsumerCircleWalletID(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockCircleRepo.getCircleWalletID(anyString())).thenReject(new Error("Method not implemented"));
  return mockCircleRepo;
}
