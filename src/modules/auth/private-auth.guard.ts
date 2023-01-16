import { ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ExtractJwt } from "passport-jwt";
import { Observable } from "rxjs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";

@Injectable()
export class PrivateAuthGuard extends AuthGuard("jwt") {
  @Inject()
  private readonly configService: CustomConfigService;

  validatePrivateBearerToken(bearerToken: string): boolean {
    const expectedBearerToken = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).privateBearerToken;
    return expectedBearerToken === bearerToken;
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    return this.validatePrivateBearerToken(bearerToken);
  }
}
