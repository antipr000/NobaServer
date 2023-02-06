import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Logger } from "winston";
import { MonoClientErrorCode, MonoClientException } from "../mono.client.exception";

export function monoClientToHTTP(logger: Logger, exception: MonoClientException) {
  switch (exception.errorCode) {
    case MonoClientErrorCode.TRANSFER_FAILED:
      return new NotFoundException(exception.message);
    case MonoClientErrorCode.UNKNOWN:
      return new InternalServerErrorException(exception.message);
    default:
      logger.error("Unmapped Mono Client error code. Exception details:", exception);
      return new HttpException(exception.message, 500);
  }
}
