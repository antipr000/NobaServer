import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
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
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "./domain/HeaderConstants";
import { HeaderValidationService } from "./header.validation.service";
import { PartnerService } from "../partner/partner.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  @Inject()
  private consumerService: ConsumerService;
  @Inject()
  private adminService: AdminService;
  @Inject()
  private partnerAdminService: PartnerAdminService;

  @Inject()
  private partnerService: PartnerService;

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

    const partner = await this.partnerService.getPartnerFromApiKey(apiKey);
    if (partner.props._id !== payload.partnerId) {
      throw new UnauthorizedException();
    }

    return this.getIdentityDomain(payload.id, payload.identityType, payload.partnerId);
  }

  private async getIdentityDomain(id: string, identityType: string, partnerId: string): Promise<AuthenticatedUser> {
    switch (identityType) {
      case consumerIdentityIdentifier:
        try {
          const consumer = await this.consumerService.findConsumerById(id);
          return {
            partnerId: partnerId,
            entity: consumer,
          };
        } catch (e) {
          throw new UnauthorizedException("Token is invalid!");
        }
      case nobaAdminIdentityIdentifier:
        try {
          const admin = await this.adminService.getAdminById(id);
          return {
            partnerId: partnerId,
            entity: admin,
          };
        } catch (e) {
          throw new UnauthorizedException("Token is invalid!");
        }
      case partnerAdminIdentityIdenitfier:
        try {
          const partnerAdmin = await this.partnerAdminService.getPartnerAdmin(id);
          return {
            partnerId: partnerId,
            entity: partnerAdmin,
          };
        } catch (e) {
          throw new UnauthorizedException("Token is invalid!");
        }
      default:
        throw new UnauthorizedException(`IdentityType should be one of "${allIdentities}"`);
    }
  }
}
