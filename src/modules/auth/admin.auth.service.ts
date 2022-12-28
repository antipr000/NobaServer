import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Utils } from "../../core/utils/Utils";
import { AdminService } from "../admin/admin.service";
import { Admin } from "../admin/domain/Admin";
import { AuthService } from "./auth.service";
import { nobaAdminIdentityIdentifier } from "./domain/IdentityType";

@Injectable()
export class AdminAuthService extends AuthService {
  private readonly identityType: string = nobaAdminIdentityIdentifier;

  @Inject()
  private readonly adminService: AdminService;

  protected getIdentityType(): string {
    return this.identityType;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async getUserId(emailOrPhone: string): Promise<string> {
    const isEmail = Utils.isEmail(emailOrPhone);
    if (!isEmail) throw new Error("Admin can only login with email");
    const admin: Admin = await this.adminService.getAdminByEmail(emailOrPhone);
    return admin.props.id;
  }

  protected async isUserSignedUp(emailOrPhone: string): Promise<boolean> {
    const isEmail = Utils.isEmail(emailOrPhone);
    try {
      if (isEmail) {
        const nobaAdmin: Admin = await this.adminService.getAdminByEmail(emailOrPhone);
        return nobaAdmin !== null && nobaAdmin !== undefined;
      } else {
        return false; //admins can only login with email
      }
    } catch (err) {
      if (err instanceof NotFoundException) return false;
      throw err;
    }
  }
}
