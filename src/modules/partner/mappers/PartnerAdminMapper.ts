import { PartnerAdmin } from "../domain/PartnerAdmin";
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
      partnerId: p.partnerId,
      email: p.email,
      role: p.role,
    };
  }
}
