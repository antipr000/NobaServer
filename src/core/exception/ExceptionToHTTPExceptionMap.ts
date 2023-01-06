import { HttpStatus, HttpException, BadRequestException } from "@nestjs/common";
import Joi from "joi";
import { TransactionSubmissionException } from "src/modules/transactions/exceptions/TransactionSubmissionException";
import { Logger } from "winston";
import { AppExceptionCode, ApplicationException, BadRequestError } from "./CommonAppException";
import { serviceToHTTP } from "./mappers/serviceToHTTP";
import { ServiceException } from "./ServiceException";

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

  if (exception instanceof ServiceException) {
    return serviceToHTTP(logger, exception);
  }

  // This should be refactored to RepositoryException
  if (exception instanceof TransactionSubmissionException) {
    return new BadRequestException(exception.disposition, exception.message);
  }

  //We return 500, if the exception is not known i.e. we don't leak sensitive information to outside world
  return new HttpException("Internal Noba Server Error.", HttpStatus.INTERNAL_SERVER_ERROR);
}
