import { UserDTO } from "../../modules/user/dto/UserDTO";

export const userEmail = "John.Doe@noba.com";
export const userID = "test-user-01";
export const userDTO: UserDTO = {
    _id: userID,
    email: userEmail,
    name: "John Doe",
    isEmailVerified: true,
    idVerified: false,
    documentVerified: false
};