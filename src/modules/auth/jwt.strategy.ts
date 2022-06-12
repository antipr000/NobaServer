import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtConstants } from "./constants";
import { UserService } from "../user/user.service";
import { UserProps } from "../user/domain/User";
import { Admin } from "../admin/domain/Admin";
import { PartnerAdmin } from "../partner/domain/PartnerAdmin";
import {
  allIdentities,
  consumerIdentityIdentifier,
  nobaAdminIdentityIdentifier,
  partnerAdminIdentityIdenitfier,
} from "./domain/IdentityType";
import { AdminService } from "../admin/admin.service";
import { PartnerAdminService } from "../partner/partneradmin.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  @Inject()
  private userService: UserService;
  @Inject()
  private adminService: AdminService;
  @Inject()
  private partnerAdminService: PartnerAdminService;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  // TODO: Move all the payload related logic to a single file.
  // TODO: Modify 'UserProps' to 'User'.
  async validate(payload: any): Promise<UserProps | Admin | PartnerAdmin> {
    return this.getIdentityDomain(payload.id, payload.identityType);
  }

  private async getIdentityDomain(id: string, identityType: string): Promise<Admin | UserProps | PartnerAdmin> {
    console.log(id, identityType);

    switch (identityType) {
      case consumerIdentityIdentifier:
        return (await this.userService.findUserById(id)).props;
      case nobaAdminIdentityIdentifier:
        return this.adminService.getAdminById(id);
      case partnerAdminIdentityIdenitfier:
        return this.partnerAdminService.getPartnerAdmin(id);
      default:
        throw new UnauthorizedException(`IdentityType should be one of "${allIdentities}"`);
    }
  }
}
