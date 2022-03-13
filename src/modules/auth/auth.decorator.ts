import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './domain/AuthenticatedUser';

//returns authenticated user details undefined if user not authenticated
export const AuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return user;
  },
);