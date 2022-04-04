import { createParamDecorator, ExecutionContext } from '@nestjs/common';

//returns authenticated user details undefined if user not authenticated
export const AuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return user;
  },
);