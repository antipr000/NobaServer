import { anyString, anything, mock, when } from "ts-mockito";
<<<<<<< HEAD:src/modules/circle/repos/mocks/mock.circle.repo.ts
import { SQLCircleRepo } from "../sql.circle.repo";
import { ICircleRepo } from "../circle.repo";
=======
import { ICircleRepo } from "../repos/circle.repo";
import { SQLCircleRepo } from "../repos/sql.circle.repo";
>>>>>>> c5a2de0c98f9fac88b62805011b501e9126f9e3a:src/modules/psp/circle/mocks/mock.circle.repo.ts

export function getMockCircleRepoWithDefaults(): ICircleRepo {
  const mockCircleRepo: ICircleRepo = mock(SQLCircleRepo);

  when(mockCircleRepo.addConsumerCircleWalletID(anyString(), anyString())).thenReject(
    new Error("Method not implemented"),
  );
  when(mockCircleRepo.getCircleWalletID(anyString())).thenReject(new Error("Method not implemented"));
  return mockCircleRepo;
}
