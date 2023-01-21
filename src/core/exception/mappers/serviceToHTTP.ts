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
import { Logger } from "winston";
import { ServiceErrorCode, ServiceException } from "../ServiceException";

export function serviceToHTTP(logger: Logger, exception: ServiceException) {
  switch (exception.errorCode) {
    case ServiceErrorCode.DOES_NOT_EXIST:
      return new NotFoundException(exception.message);
    case ServiceErrorCode.ALREADY_EXISTS:
      return new HttpException(exception.message, 403);
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
    case ServiceErrorCode.RATE_LIMIT_EXCEEDED:
      return new HttpException(exception.message, 429);
    case ServiceErrorCode.UNKNOWN:
      return new InternalServerErrorException(exception.message);
    default:
      logger.error("Unmapped Service error code. Exception details:", exception);
      return new HttpException(exception.message, 500);
  }
}
