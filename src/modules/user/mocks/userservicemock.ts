import { mock, when } from "ts-mockito";
import { UserService } from "../user.service";
import { userEmail, userDTO, userID } from "../../../core/tests/constants";
import { Result } from "../../../core/logic/Result";
import {User} from "../domain/User";

const mockedUserService: UserService = mock(UserService);
const user = User.createUser(userDTO);

when(mockedUserService.createUserIfFirstTimeLogin(userEmail))
    .thenReturn(new Promise((resolve, _) => {
        resolve(userDTO);
    }));

when(mockedUserService.findUserByEmailOrPhone(userEmail))
    .thenReturn(new Promise((resolve, _) => {
        resolve(Result.ok(user))
    }));

when(mockedUserService.getUser(userID))
    .thenReturn(new Promise((resolve, _) => {
        resolve(userDTO);
    }));
    
export {
    mockedUserService
};