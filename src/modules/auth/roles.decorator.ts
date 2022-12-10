import { SetMetadata } from "@nestjs/common";
import { Role } from "./role.enum";

//***************** https://docs.nestjs.com/security/authorization */

export const ROLES_KEY = "roles";
export const ONE_OF_ROLES_KEY = "oneOfRoles";

export const UserID = "userID"; //user id
export const AdminId = "adminID";
export const PaymentMethodID = "paymentMethodID"; //payment method id

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const OneOfRoles = (...roles: Role[]) => SetMetadata(ONE_OF_ROLES_KEY, roles);
