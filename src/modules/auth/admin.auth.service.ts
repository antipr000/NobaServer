import { Inject, Injectable, NotFoundException } from "@nestjs/common";
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

  protected async getUserId(emailOrPhone: string): Promise<string> {
    const admin: Admin = await this.adminService.getAdminByEmail(emailOrPhone);
    return admin.props._id;
  }

  protected async isUserSignedUp (email: string): Promise<boolean> {
    try {
      const nobaAdmin: Admin = 
        await this.adminService.getAdminByEmail(email);
      return (nobaAdmin !== null && nobaAdmin !== undefined);
    } catch(err) {
      if (err instanceof NotFoundException)
        return false;
      throw err;
    }
  }
}
