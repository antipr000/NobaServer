import { Injectable } from "@nestjs/common";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { Partner, PartnerProps } from "../../modules/partner/domain/Partner";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { DBProvider } from "../DBProvider";
import { convertDBResponseToJsObject } from "../../infra/mongodb/MongoDBUtils";

@Injectable()
export class NobaPartnerSeed {
  private readonly apiKeyForEmbed: string;
  private readonly partnerId: string;

  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    this.partnerId = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).partnerID;
    this.apiKeyForEmbed = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).apiKeyForEmbed;
  }

  async seed() {
    const partnerModel = await this.dbProvider.getPartnerModel();
    try {
      // Update all partner records so that defaults are added for missing fields
      const allPartnersRecords: PartnerProps[] = convertDBResponseToJsObject(await partnerModel.find().exec());
      const allPartners: Partner[] = allPartnersRecords.map(Partner.createPartner);
      const promises = allPartners.map(partner =>
        partnerModel.findByIdAndUpdate(partner.props._id, partner.props).exec(),
      );
      await Promise.all(promises);

      if (allPartners.filter(partner => this.partnerId === partner.props._id)) {
        console.log("Noba partner already exists");
        return;
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
