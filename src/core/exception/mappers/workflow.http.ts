import { BadRequestException, HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Logger } from "winston";
import { WorkflowException, WorkflowErrorCode } from "../workflow.exception";

export function workflowToHTTP(logger: Logger, exception: WorkflowException) {
  switch (exception.errorCode) {
    case WorkflowErrorCode.TRANSACTION_FAILED:
      return new BadRequestException(exception.message);
    case WorkflowErrorCode.UNKNOWN:
      return new InternalServerErrorException(exception.message);
    default:
      logger.error("Unmapped Workflow error code. Exception details:", exception);
      return new HttpException(exception.message, 500);
  }
}
