import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getUserId(emailOrPhone: string, _?: string): Promise<string> {
    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.getPartnerAdminFromEmail(emailOrPhone);
    return partnerAdmin.props._id;
  }

  protected async isUserSignedUp(email: string): Promise<boolean> {
    try {
      const partnerAdmin: PartnerAdmin = await this.partnerAdminService.getPartnerAdminFromEmail(email);
      return partnerAdmin !== null && partnerAdmin !== undefined;
    } catch (err) {
      if (err instanceof NotFoundException) return false;
      throw err;
    }
  }
}
