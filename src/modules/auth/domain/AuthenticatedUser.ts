import { Admin } from "../../admin/domain/Admin";
import { Consumer } from "../../consumer/domain/Consumer";

export class AuthenticatedUser {
  entity: Admin | Consumer;
}
