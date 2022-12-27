import { BaseException, BaseExceptionConstructor, SeverityLevel } from "./BaseException";

export const enum ServiceErrorCode {
  SEMANTIC_VALIDATION = "Semantic validation error",
  DOES_NOT_EXIST = "Item does not exist error",
  UNAUTHORIZED = "Unauthorized error",
  UNAUTHENTICATED = "Unauthenticated error",
  NOT_IMPLEMENTED = "Not implemented error",
  UNKNOWN = "Unknown error has occured",
}

interface ServiceExceptionConstructor extends BaseExceptionConstructor<ServiceErrorCode> {}

export class ServiceException extends BaseException<ServiceErrorCode> {
  constructor(params: ServiceExceptionConstructor) {
    super({
      message: params.message ?? params.errorCode,
      errorCode: params.errorCode,
      severity: params.severity,
      error: params.error,
    });
  }
}
