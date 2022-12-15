import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtConstants } from "./constants";
import { ConsumerService } from "../consumer/consumer.service";

import { allIdentities, consumerIdentityIdentifier, nobaAdminIdentityIdentifier } from "./domain/IdentityType";
import { AdminService } from "../admin/admin.service";
import { AuthenticatedUser } from "./domain/AuthenticatedUser";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  @Inject()
  private consumerService: ConsumerService;
  @Inject()
  private adminService: AdminService;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true,
    });
  }

  // TODO: Move all the payload related logic to a single file.
  async validate(payload: any): Promise<AuthenticatedUser> {
    return this.getIdentityDomain(payload.id, payload.identityType);
  }

  private async getIdentityDomain(id: string, identityType: string): Promise<AuthenticatedUser> {
    switch (identityType) {
      case consumerIdentityIdentifier:
        try {
          const consumer = await this.consumerService.findConsumerById(id);
          return {
            entity: consumer,
          };
        } catch (e) {
          throw new UnauthorizedException("Token is invalid!");
        }
      case nobaAdminIdentityIdentifier:
        try {
          const admin = await this.adminService.getAdminById(id);
          return {
            entity: admin,
          };
        } catch (e) {
          throw new UnauthorizedException("Token is invalid!");
        }

      default:
        throw new UnauthorizedException(`IdentityType should be one of "${allIdentities}"`);
    }
  }
}
