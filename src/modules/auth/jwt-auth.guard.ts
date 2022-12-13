import { ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { IS_NO_API_KEY_NEEDED_KEY, IS_PUBLIC_KEY } from "./public.decorator";
import { HeaderValidationService } from "./header.validation.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  @Inject() headerValidationService: HeaderValidationService;
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  constructor(private reflector: Reflector) {
    super();
  }

  private async validateHeaders(request: Request): Promise<boolean> {
    return true;
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

    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      return this.validateHeaders(request);
    }

    return super.canActivate(context);
  }
}
