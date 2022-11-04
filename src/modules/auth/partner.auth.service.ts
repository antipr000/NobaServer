import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PartnerAdminService } from "../partner/partneradmin.service";
import { AuthService } from "./auth.service";
import { partnerAdminIdentityIdenitfier } from "./domain/IdentityType";
import { PartnerAdmin } from "../partner/domain/PartnerAdmin";
import { Utils } from "../../core/utils/Utils";

@Injectable()
export class PartnerAuthService extends AuthService {
  private readonly identityType: string = partnerAdminIdentityIdenitfier;

  @Inject()
  private readonly partnerAdminService: PartnerAdminService;

  protected getIdentityType(): string {
    return this.identityType;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getUserId(emailOrPhone: string, _: string, createPartnerIfNotExists: boolean): Promise<string> {
    const isEmail = Utils.isEmail(emailOrPhone);
    if (!isEmail) throw new Error("Partner Admin can only login with email");
    const partnerAdmin: PartnerAdmin = await this.partnerAdminService.getPartnerAdminFromEmail(emailOrPhone);
    return partnerAdmin.props._id;
  }

  protected async isUserSignedUp(emailOrPhone: string): Promise<boolean> {
    const isEmail = Utils.isEmail(emailOrPhone);
    try {
      if (isEmail) {
        const partnerAdmin: PartnerAdmin = await this.partnerAdminService.getPartnerAdminFromEmail(emailOrPhone);
        return partnerAdmin !== null && partnerAdmin !== undefined;
      } else {
        return false; //admins can only login with email
      }
    } catch (err) {
      if (err instanceof NotFoundException) return false;
      throw err;
    }
  }
}
