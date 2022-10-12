import { Injectable } from "@nestjs/common";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { Partner } from "../../modules/partner/domain/Partner";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { DBProvider } from "../DBProvider";

@Injectable()
export class NobaPartnerSeed {
  private readonly apiKeyForEmbed: string;
  private readonly partnerId: string;

  constructor(private readonly dbProvider: DBProvider, private readonly configService: CustomConfigService) {
    this.partnerId = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).partnerID;
    this.apiKeyForEmbed = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).apiKeyForEmbed;
  }

  async seed() {
    const partnerModel = await this.dbProvider.getPartnerModel();
    try {
      const response = await partnerModel.findById(this.partnerId).exec();
      if (!response) {
        console.log("Noba partner already exists");
      }
    } catch (e) {
      // pass through
    }

    console.log("Seeding Noba Partner");
    const partner = Partner.createPartner({
      _id: this.partnerId,
      name: "Noba",
      apiKeyForEmbed: this.apiKeyForEmbed,
    });

    await partnerModel.create(partner.props);
  }
}
