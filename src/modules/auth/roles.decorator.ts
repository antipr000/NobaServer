import { SetMetadata } from "@nestjs/common";
import { Role } from "./role.enum";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const UserID = "userID"; //user id
export const AdminId = "adminID";
export const PaymentMethodID = "paymentMethodID"; //payment method id
