import { ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { IS_ADMIN_KEY } from "./admin.decorator";
import { UserProps } from "../user/domain/User";


@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        if(isPublic){
            return true;
        }

        return super.canActivate(context);
    }

    handleRequest<TUser = UserProps>(err, user: UserProps, info, context: ExecutionContext, status): TUser {
        // TODO: Query on path params and throw error if userId in path doesn't match user._id
        const userIdInPath: string|undefined = context.switchToHttp().getRequest().params.userID;
        if(userIdInPath && userIdInPath !== user._id) {
            throw new ForbiddenException();
        }
        const isAdmin = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if(isAdmin && !user.isAdmin) throw new ForbiddenException();
        return super.handleRequest(err, user, info, context, status);
    }
}