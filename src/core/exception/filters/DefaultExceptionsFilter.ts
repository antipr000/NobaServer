import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import { Logger } from "winston";
import { convertToHTTPException, isApplicationException } from "../AppExceptionToHTTPExceptionMap";
import Joi from "joi";
import { ApplicationException } from "../CommonAppException";

@Catch()
export class DefaultExceptionsFilter<Error> implements ExceptionFilter {
  constructor(private logger: Logger) {}

  // TODO: this catch method is a bit overloaded. We should probably split out each exception into it's own custom filter
  catch(originalException: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const timestamp = new Date().toISOString();

    //Send HTTP Exception, don't send anything sensitive here i.e. service internal info
    const httpException = convertToHTTPException(originalException);
    const status = httpException.getStatus();
    const message = httpException.message;

    //log error info on service side, don't catch everything else how would we know what is going wrong?
    const log = true;
    if (log) {
      let messageToBeLogged;
      if (originalException instanceof HttpException) {
        messageToBeLogged = originalException.message;
      } else if (originalException instanceof Error) {
        messageToBeLogged = originalException.message + "\n" + originalException.stack?.toString();
      } else {
        messageToBeLogged = originalException;
      }

      //TODO should we log the server error details? we may be logging sensitive information like access code from external applications if error is during authz call
      const serverError = isApplicationException(originalException)
        ? (originalException as any as ApplicationException).getDetailsForServer()
        : {};

      this.logger.error(messageToBeLogged, {
        serverError: serverError,
        timestamp,
      });
    }

    response.header("x-noba-retryable", true);
    response.status(status).json({
      statusCode: status,
      details: Joi.isError(originalException) ? httpException.getResponse() : null,
      message: message,
      timestamp: timestamp,
      path: request.url,
    });
  }
}
