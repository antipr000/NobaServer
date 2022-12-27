import { BaseException, SeverityLevel } from "./BaseException";

export const enum ServiceErrorCode {
  SEMANTIC_VALIDATION = "Semantic validation error",
  DOES_NOT_EXIST = "Item does not exist",
  UNABLE_TO_PROCESS = "Unable to process",
  UNAUTHORIZED = "Unauthorized",
  UNAUTHENTICATED = "Unauthenticated",
  NOT_IMPLEMENTED = "Not implemented",
  UNKNOWN = "Unknown error has occured",
}

export class ServiceException extends BaseException<ServiceErrorCode> {
  constructor(errorCode: ServiceErrorCode, message?: string, severity?: SeverityLevel, error?: any) {
    super({
      message: message ?? errorCode,
      errorCode,
      severity,
      error,
    });
  }
}
