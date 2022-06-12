import { Inject, Injectable } from "@nestjs/common";
import { PartnerAdminService } from "../partner/partneradmin.service";
import { AuthService } from "./auth.service";
import { partnerAdminIdentityIdenitfier } from "./domain/IdentityType";
import { PartnerAdmin } from "../partner/domain/PartnerAdmin";

@Injectable()
export class PartnerAuthService extends AuthService {
  private readonly identityType: string = partnerAdminIdentityIdenitfier;

  @Inject()
  private readonly partnerAdminService: PartnerAdminService;

  protected getIdentityType(): string {
    return this.identityType;
  }

  protected async getUserId(emailOrPhone: string): Promise<string> {
    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.getPartnerAdminFromEmail(emailOrPhone);
    return partnerAdmin.props._id;
  }
}
