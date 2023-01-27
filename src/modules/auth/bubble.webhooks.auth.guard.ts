import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ExtractJwt } from "passport-jwt";
import { Observable } from "rxjs";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";

@Injectable()
export class BubbleWebhookAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly configService: CustomConfigService) {
    super();
  }

  private validateBearerToken(bearerToken: string): boolean {
    const expectedBearerToken = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).bubbleBearerToken;
    return expectedBearerToken === bearerToken;
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    return this.validateBearerToken(bearerToken);
  }
}
