import { Injectable } from "@nestjs/common";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { isProductionEnvironment, NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { Partner, PartnerProps } from "../../modules/partner/domain/Partner";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { DBProvider } from "../DBProvider";
import { convertDBResponseToJsObject } from "../../infra/mongodb/MongoDBUtils";
import { PartnerAdmin, PARTNER_ADMIN_ROLE_TYPES } from "../../modules/partner/domain/PartnerAdmin";

@Injectable()
export class NobaPartnerSeed {
  private readonly apiKeyForEmbed: string;
  private readonly partnerId: string;

  constructor(private readonly dbProvider: DBProvider, configService: CustomConfigService) {
    this.partnerId = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).partnerID;
    this.apiKeyForEmbed = configService.get<NobaConfigs>(NOBA_CONFIG_KEY).apiKeyForEmbed;
  }

  async seedPartnerAdmin(email: string, name: string) {
    const partnerAdminModel = await this.dbProvider.getPartnerAdminModel();
    const partnerAdminRecord = await partnerAdminModel.findOne({ email: email, partnerId: this.partnerId }).exec();

    if (!partnerAdminRecord) {
      const partnerAdmin = PartnerAdmin.createPartnerAdmin({
        email: email,
        name: name,
        role: PARTNER_ADMIN_ROLE_TYPES.ALL,
        partnerId: this.partnerId,
      });

      await partnerAdminModel.create(partnerAdmin.props);
    }
  }

  async seedPartnerAdmins() {
    if (!isProductionEnvironment()) {
      console.log("Seeding Noba devs as partner admins");
      const adminsToAdd = [
        {
          name: "Soham Mukherjee",
          email: "soham@noba.com",
        },
        {
          name: "Jonathan Wu",
          email: "jonathan@noba.com",
        },
        {
          name: "John Nguyen",
          email: "john@noba.com",
        },
        {
          name: "Ankit Gaur",
          email: "ankit@noba.com",
        },
        {
          name: "Subham Agarwal",
          email: "subham@noba.com",
        },
        {
          name: "Mohit Mohta",
          email: "mohit@noba.com",
        },
        {
          name: "Justin Ashworth",
          email: "justin@noba.com",
        },
      ];

      const promises = adminsToAdd.map(partnerAdmin => this.seedPartnerAdmin(partnerAdmin.email, partnerAdmin.name));

      await Promise.all(promises);
    }
  }

  async seed() {
    const partnerModel = await this.dbProvider.getPartnerModel();
    try {
      // Update all partner records so that defaults are added for missing fields
      const allPartnersRecords: PartnerProps[] = convertDBResponseToJsObject(await partnerModel.find().exec());
      const allPartners: Partner[] = allPartnersRecords.map(Partner.createPartner);
      allPartners.forEach(partner => {
        if (this.partnerId === partner.props._id) {
          partner.props.apiKeyForEmbed = this.apiKeyForEmbed;
        }
      });
      const promises = allPartners.map(partner =>
        partnerModel.findByIdAndUpdate(partner.props._id, partner.props).exec(),
      );
      await Promise.all(promises);

      if (allPartners.filter(partner => this.partnerId === partner.props._id).length > 0) {
        console.log("Noba partner already exists");
        await this.seedPartnerAdmins();
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

    await this.seedPartnerAdmins();
  }
}
