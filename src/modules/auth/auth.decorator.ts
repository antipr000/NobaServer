import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "../user/domain/User";

//returns authenticated user details undefined if user not authenticated
export const AuthUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  return user;
});

// TODO create typed decorators for other authenticated user types though it should always be User
