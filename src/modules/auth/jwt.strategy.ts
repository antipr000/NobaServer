import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { jwtConstants } from "./constants";
import { ConsumerService } from "../consumer/consumer.service";

import { allIdentities, consumerIdentityIdentifier, nobaAdminIdentityIdentifier } from "./domain/IdentityType";
import { AdminService } from "../admin/admin.service";
import { AuthenticatedUser } from "./domain/AuthenticatedUser";
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "./domain/HeaderConstants";
import { HeaderValidationService } from "./header.validation.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  @Inject()
  private consumerService: ConsumerService;
  @Inject()
  private adminService: AdminService;

  @Inject()
  private headerValidationService: HeaderValidationService;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true,
    });
  }

  // TODO: Move all the payload related logic to a single file.
  async validate(request: Request, payload: any): Promise<AuthenticatedUser> {
    const apiKey = request.headers[X_NOBA_API_KEY];
    const signature = request.headers[X_NOBA_SIGNATURE];
    const timestamp = request.headers[X_NOBA_TIMESTAMP];
    try {
      await this.headerValidationService.validateApiKeyAndSignature(
        apiKey,
        timestamp,
        signature,
        request.method,
        request.url.split("?")[0], // Only take URI path, no parameters
        JSON.stringify(request.body),
      );
    } catch (e) {
      throw new ForbiddenException("Signature mismatch or header fields missing!");
    }
    return this.getIdentityDomain(payload.id, payload.identityType);
  }

  private async getIdentityDomain(id: string, identityType: string): Promise<AuthenticatedUser> {
    switch (identityType) {
      case consumerIdentityIdentifier:
        try {
          const consumer = await this.consumerService.getConsumer(id);
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
