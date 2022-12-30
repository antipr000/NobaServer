import { anyString, anything, mock, when } from "ts-mockito";
import { ICircleRepo } from "../repos/CircleRepo";
import { SQLCircleRepo } from "../repos/SQLCircleRepo";

export function getMockCircleRepoWithDefaults(): ICircleRepo {
  const mockCircleRepo: ICircleRepo = mock(SQLCircleRepo);

  when(mockCircleRepo.addConsumerCircleWalletID(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockCircleRepo.getCircleWalletID(anyString())).thenReject(new Error("Method not implemented"));
  return mockCircleRepo;
}
