import { BaseException } from "./BaseException";

export const enum ServiceErrorCode {
  SEMANTIC_VALIDATION = "Semantic validation error",
  DOES_NOT_EXIST = "Item does not exist error",
  UNAUTHORIZED = "Unauthorized error",
  UNAUTHENTICATED = "Unauthenticated error",
  NOT_IMPLEMENTED = "Not implemented error",
  UNKNOWN = "Unknown error has occured",
}

export class ServiceException extends BaseException<ServiceErrorCode> {
  constructor(errorCode: ServiceErrorCode, message?: string, error?: any) {
    super({ message: message ?? errorCode, errorCode, error });
  }
}
