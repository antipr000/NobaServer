import { Admin } from "../../admin/domain/Admin";
import { PartnerAdmin } from "../../partner/domain/PartnerAdmin";
import { User } from "../../user/domain/User";

export type AuthenticatedUser = Admin | User | PartnerAdmin;
