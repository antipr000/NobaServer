import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { HeaderValidationService } from "./header.validation.service";
import { ExtractJwt } from "passport-jwt";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";

@Injectable()
export class AdminAuthGuard implements CanActivate {
  @Inject() headerValidationService: HeaderValidationService;

  @Inject()
  private readonly configService: CustomConfigService;

  private validatePrivateBearerToken(bearerToken: string): boolean {
    const expectedBearerToken = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).adminBearerToken;
    return expectedBearerToken === bearerToken;
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    return this.validatePrivateBearerToken(bearerToken);
  }
}
