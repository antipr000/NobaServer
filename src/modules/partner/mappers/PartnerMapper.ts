import { Partner } from "../domain/Partner";
import { PartnerDTO } from "../dto/PartnerDTO";
import { Mapper } from "../../../core/infra/Mapper";

export class PartnerMapper implements Mapper<Partner> {
  public toDomain(raw: any): Partner {
    return Partner.createPartner(raw);
  }

  public toDTO(partner: Partner): PartnerDTO {
    const p = partner.props;
    return {
      _id: p._id,
      name: p.name,
      verificationData: p.verificationData,
      apiKey: p.apiKey,
      apiKeyForEmbed: p.apiKeyForEmbed,
      webhookClientID: p.webhookClientID,
      webhookSecret: p.webhookSecret,
      secretKey: p.secretKey,
      logo: (p.config ?? {}).logo,
      logoSmall: (p.config ?? {}).logoSmall,
      apiKeyForEmbed: p.apiKeyForEmbed,
      webhookClientID: p.webhookClientID,
      webhookSecret: p.webhookSecret,
      config: p.config,
      isAPIEnabled: p.isAPIEnabled,
      isEmbedEnabled: p.isEmbedEnabled,
    };
  }
}
