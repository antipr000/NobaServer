import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../ServiceException";

export function serviceToHTTP(exception: ServiceException) {
  switch (exception.errorCode) {
    case ServiceErrorCode.DOES_NOT_EXIST:
      return new NotFoundException(exception.message);
    case ServiceErrorCode.NOT_IMPLEMENTED:
      return new NotImplementedException(exception.message);
    case ServiceErrorCode.SEMANTIC_VALIDATION:
      return new BadRequestException(exception.message);
    case ServiceErrorCode.UNABLE_TO_PROCESS:
      return new NotAcceptableException(exception.message);
    case ServiceErrorCode.UNAUTHENTICATED:
      return new UnauthorizedException(exception.message); // The semantic meaning of 401 is no credentials
    case ServiceErrorCode.UNAUTHORIZED:
      return new ForbiddenException(exception.message); // The semantic meaning of 403 is incorrect rights
    case ServiceErrorCode.UNKNOWN:
      return new InternalServerErrorException(exception.message);
    default:
      return new HttpException(exception.message, 500);
  }
}
