import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from "@nestjs/common";
import { Logger } from "winston";
import { convertToHTTPException } from "../ExceptionToHTTPExceptionMap";
import Joi from "joi";
import { BaseException } from "../base.exception";
import { Request } from "express";

@Catch()
export class DefaultExceptionsFilter<Error> implements ExceptionFilter {
  constructor(private logger: Logger) {}

  // TODO: this catch method is a bit overloaded. We should probably split out each exception into it's own custom filter
  catch(originalException: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();

    if (originalException instanceof BaseException) {
      response.header("x-noba-retryable", originalException.retry);
      response.header("x-noba-message-format", originalException.messageFormat);
    }

    //Send HTTP Exception, don't send anything sensitive here i.e. service internal info
    const httpException = convertToHTTPException(this.logger, originalException);
    const status = httpException.getStatus();
    const message = httpException.message;

    //log error info on service side, don't catch everything else how would we know what is going wrong?
    const log = true;
    if (log) {
      let messageToBeLogged: string;
      if (originalException instanceof HttpException) {
        messageToBeLogged = originalException.message;
      } else if (originalException instanceof Error) {
        messageToBeLogged = originalException.message + "\n" + originalException.stack?.toString();
      } else {
        messageToBeLogged = originalException.toString();
      }

      this.logger.warn(messageToBeLogged, {
        timestamp,
      });
    }

    response.status(status).json({
      statusCode: status,
      details: Joi.isError(originalException) ? httpException.getResponse() : null,
      message: message,
      timestamp: timestamp,
      path: request.url,
    });
  }
}
