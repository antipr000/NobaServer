import { ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { IS_NO_API_KEY_NEEDED_KEY, IS_PUBLIC_KEY } from "./public.decorator";
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "./domain/HeaderConstants";
import { HeaderValidationService } from "./header.validation.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  @Inject() headerValidationService: HeaderValidationService;

  constructor(private reflector: Reflector) {
    super();
  }

  private async validateHeaders(request: Request): Promise<boolean> {
    try {
      const apiKey = request.headers[X_NOBA_API_KEY.toLowerCase()];
      const signature = request.headers[X_NOBA_SIGNATURE.toLowerCase()];
      const timestamp = request.headers[X_NOBA_TIMESTAMP.toLowerCase()];

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

    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      return this.validateHeaders(request);
    }

    return super.canActivate(context);
  }
}
