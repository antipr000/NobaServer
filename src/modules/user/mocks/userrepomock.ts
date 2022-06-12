import { mock, when } from "ts-mockito";
import { MongoDBUserRepo } from "../repos/MongoDBUserRepo";
import { IUserRepo } from "../repos/UserRepo";
import { userEmail, userDTO, userID } from "../../../core/tests/constants";
import { Result } from "../../../core/logic/Result";
import { User } from "../domain/User";

const mockedUserRepo: IUserRepo = mock(MongoDBUserRepo);
const user = User.createUser(userDTO);

when(mockedUserRepo.createUser(user)).thenReturn(
  new Promise((resolve, _) => {
    resolve(user);
  }),
);

when(mockedUserRepo.getUser(userID)).thenReturn(
  new Promise((resolve, _) => {
    resolve(user);
  }),
);

when(mockedUserRepo.getUserByEmail(userEmail)).thenReturn(
  new Promise((resolve, _) => {
    resolve(Result.ok(user));
  }),
);

export { mockedUserRepo };
