import { ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { IS_NO_API_KEY_NEEDED_KEY, IS_PUBLIC_KEY } from "./public.decorator";
import { HeaderValidationService } from "./header.validation.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "./domain/HeaderConstants";
import { ExtractJwt } from "passport-jwt";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  @Inject() headerValidationService: HeaderValidationService;
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  @Inject()
  private readonly configService: CustomConfigService;

  constructor(private reflector: Reflector) {
    super();
  }

  private validatePrivateBearerToken(bearerToken: string): boolean {
    const expectedBearerToken = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).privateBearerToken;
    return expectedBearerToken === bearerToken;
  }

  private async validateHeaders(request: Request): Promise<boolean> {
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
      return true;
    } catch (e) {
      this.logger.error(`Failed to validate headers. Reason: ${e.message}`);
      return false;
    }
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const doesNotNeedApiKey = this.reflector.getAllAndOverride<boolean>(IS_NO_API_KEY_NEEDED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (doesNotNeedApiKey) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const path: string = request.path;

    if (path.startsWith("/wf/v1")) {
      const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
      return this.validatePrivateBearerToken(bearerToken);
    }

    if (isPublic) {
      return this.validateHeaders(request);
    }

    return super.canActivate(context);
  }
}
