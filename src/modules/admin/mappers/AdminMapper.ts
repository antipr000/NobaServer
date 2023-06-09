import { Admin, NOBA_ADMIN_ROLE_TYPES } from "../domain/Admin";
import { Mapper } from "../../../core/infra/Mapper";
import { NobaAdminDTO } from "../dto/NobaAdminDTO";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminMapper implements Mapper<Admin> {
  public toDomain(raw: any): Admin {
    if (raw === undefined || raw === null) return undefined;

    return Admin.createAdmin({
      id: raw.id,
      name: raw.name,
      email: raw.email,
      role: raw.role,
    });
  }

  public toDTO(nobaAdmin: Admin): NobaAdminDTO {
    const dto: NobaAdminDTO = new NobaAdminDTO();
    dto.id = nobaAdmin.props.id;
    dto.email = nobaAdmin.props.email;
    dto.name = nobaAdmin.props.name;
    dto.role = NOBA_ADMIN_ROLE_TYPES[nobaAdmin.props.role as keyof typeof NOBA_ADMIN_ROLE_TYPES];

    return dto;
  }
}
