import { BaseException, BaseExceptionConstructor } from "./BaseException";

export const enum ServiceErrorCode {
  SEMANTIC_VALIDATION = "Semantic validation error",
  DOES_NOT_EXIST = "Item does not exist",
  UNABLE_TO_PROCESS = "Unable to process",
  UNAUTHORIZED = "Unauthorized",
  UNAUTHENTICATED = "Unauthenticated",
  NOT_IMPLEMENTED = "Not implemented",
  UNKNOWN = "Unknown error has occured",
}

interface ServiceExceptionConstructor extends BaseExceptionConstructor<ServiceErrorCode> {}

export class ServiceException extends BaseException<ServiceErrorCode> {
  constructor(params: ServiceExceptionConstructor) {
    super({
      message: params.message ?? params.errorCode,
      errorCode: params.errorCode,
      retry: params.retry,
      severity: params.severity,
      error: params.error,
    });
  }
}
