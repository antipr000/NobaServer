import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Logger } from "winston";
import { RepoErrorCode, RepoException } from "../repo.exception";

export function repoToHTTP(logger: Logger, exception: RepoException) {
  switch (exception.errorCode) {
    case RepoErrorCode.NOT_FOUND:
      return new NotFoundException(exception.message);
    case RepoErrorCode.INVALID_DATABASE_RECORD:
      return new InternalServerErrorException(exception.message);
    case RepoErrorCode.DATABASE_INTERNAL_ERROR:
      return new InternalServerErrorException(exception.message);
    case RepoErrorCode.UNKNOWN:
      return new InternalServerErrorException(exception.message);
    default:
      logger.error("Unmapped Repository error code. Exception details:", exception);
      return new HttpException(exception.message, 500);
  }
}
