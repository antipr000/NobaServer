import { Admin } from "../../admin/domain/Admin";
import { PartnerAdmin } from "../../partner/domain/PartnerAdmin";
import { Consumer } from "../../consumer/domain/Consumer";

export class AuthenticatedUser {
  entity: Admin | Consumer | PartnerAdmin;
  partnerId: string;
}
