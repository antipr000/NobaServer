import { HttpStatus, HttpException, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import Joi from "joi";
import { Logger } from "winston";
import { AppExceptionCode, BadRequestError } from "./CommonAppException";
import { serviceToHTTP } from "./mappers/service.http";
import { ServiceException } from "./service.exception";
import { repoToHTTP } from "./mappers/repo.http";
import { RepoException } from "./repo.exception";
import { WorkflowException } from "./workflow.exception";
import { workflowToHTTP } from "./mappers/workflow.http";
import { BaseException } from "./base.exception";

export function convertToHTTPException(logger: Logger, exception: any): HttpException {
  if (Joi.isError(exception)) {
    return new BadRequestError({
      message: exception.message,
      clientExceptionCode: AppExceptionCode.INVALID_INPUT,
      messageForClient: exception.message,
    }).toHTTPException();
  }

  //TODO can something leak here? I guess when this app calls some other service and if that service throws HTTPException with sensitive information
  if (exception instanceof HttpException) return exception;
  else if (exception instanceof ServiceException) {
    return serviceToHTTP(logger, exception);
  } else if (exception instanceof RepoException) {
    return repoToHTTP(logger, exception);
  } else if (exception instanceof WorkflowException) {
    return workflowToHTTP(logger, exception);
  } else if (exception instanceof BaseException) {
    return new InternalServerErrorException(exception.message);
  }

  //We return 500, if the exception is not known i.e. we don't leak sensitive information to outside world
  return new HttpException("Internal Noba Server Error.", HttpStatus.INTERNAL_SERVER_ERROR);
}
