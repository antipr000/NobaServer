import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtConstants } from "./constants";
import { ConsumerService } from "../consumer/consumer.service";

import {
  allIdentities,
  consumerIdentityIdentifier,
  nobaAdminIdentityIdentifier,
  partnerAdminIdentityIdenitfier,
} from "./domain/IdentityType";
import { AdminService } from "../admin/admin.service";
import { PartnerAdminService } from "../partner/partneradmin.service";
import { AuthenticatedUser } from "./domain/AuthenticatedUser";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  @Inject()
  private consumerService: ConsumerService;
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
  async validate(payload: any): Promise<AuthenticatedUser> {
    return this.getIdentityDomain(payload.id, payload.identityType);
  }

  private async getIdentityDomain(id: string, identityType: string): Promise<AuthenticatedUser> {
    console.log(id, identityType);
    switch (identityType) {
      case consumerIdentityIdentifier:
        try {
          return await this.consumerService.findConsumerById(id);
        } catch (e) {
          throw new UnauthorizedException("Token is invalid!");
        }
      case nobaAdminIdentityIdentifier:
        try {
          return this.adminService.getAdminById(id);
        } catch (e) {
          throw new UnauthorizedException("Token is invalid!");
        }
      case partnerAdminIdentityIdenitfier:
        try {
          return this.partnerAdminService.getPartnerAdmin(id);
        } catch (e) {
          throw new UnauthorizedException("Token is invalid!");
        }
      default:
        throw new UnauthorizedException(`IdentityType should be one of "${allIdentities}"`);
    }
  }
}
