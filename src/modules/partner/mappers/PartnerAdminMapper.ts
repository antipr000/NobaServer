import { PartnerAdmin, PARTNER_ADMIN_ROLE_TYPES } from "../domain/PartnerAdmin";
import { PartnerAdminDTO } from "../dto/PartnerAdminDTO";
import { Mapper } from "../../../core/infra/Mapper";

export class PartnerAdminMapper implements Mapper<PartnerAdmin> {
  public toDomain(raw: any): PartnerAdmin {
    return PartnerAdmin.createPartnerAdmin(raw);
  }

  public toDTO(partnerAdmin: PartnerAdmin): PartnerAdminDTO {
    const p = partnerAdmin.props;
    return {
      _id: p._id,
      name: p.name,
      partnerID: p.partnerId,
      email: p.email,
      role: PARTNER_ADMIN_ROLE_TYPES[p.role],
    };
  }
}
