import { Admin, AdminProps } from "../domain/Admin";
import { Mapper } from "../../../core/infra/Mapper";
import { NobaAdminDTO } from "../dto/NobaAdminDTO";
import { Injectable } from "@nestjs/common";

export type AdminMinPropertySetForDBLookUp = Pick<AdminProps, "_id">;

@Injectable()
export class AdminMapper implements Mapper<Admin> {
  public toDomain(raw: any): Admin {
    return Admin.createAdmin(raw);
  }

  public toDTO(nobaAdmin: Admin): NobaAdminDTO {
    const dto: NobaAdminDTO = new NobaAdminDTO();
    dto._id = nobaAdmin.props._id;
    dto.email = nobaAdmin.props.email;
    dto.name = nobaAdmin.props.name;
    dto.role = nobaAdmin.props.role;

    return dto;
  }
}
