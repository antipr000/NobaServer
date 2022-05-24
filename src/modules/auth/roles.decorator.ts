import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';

//***************** https://docs.nestjs.com/security/authorization */

export const ROLES_KEY = 'roles';
export const ONE_OF_ROLES_KEY = 'oneOfRoles';

export const UserID = "userID"; //user id
export const PaymentMethodId = "paymentMethodId"; //payment method id
export const FromDate = "fromDate";
export const ToDate = "toDate";
export const DownloadFormat = "downloadFormat";

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const OneOfRoles = (...roles: Role[]) => SetMetadata(OneOfRoles, roles);
