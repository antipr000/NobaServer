import { createParamDecorator, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Consumer } from "../consumer/domain/Consumer";

//returns authenticated user details undefined if user not authenticated
export const AuthUser = createParamDecorator((data: unknown, ctx: ExecutionContext): Consumer => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user = request.user?.entity;
  if (!(user instanceof Consumer)) {
    throw new ForbiddenException();
  } else if (user.props.isDisabled) {
    throw new ForbiddenException("User account is deactivated!");
  }
  return user;
});
