import { GenericException } from "./GenericException";

export const enum ServiceErrorCode {
  SEMANTIC_VALIDATION = "Semantic validation error",
  DOES_NOT_EXIST = "Item does not exist error",
  UNAUTHORIZED = "Unauthorized error",
  UNAUTHENTICATED = "Unauthenticated error",
  NOT_IMPLEMENTED = "Not implemented error",
  UNKNOWN = "Unknown error",
}

export class ServiceException extends GenericException<ServiceErrorCode> {
  constructor(message: string, errorCode: ServiceErrorCode, error?: any) {
    super({ message, errorCode, error });
  }
}
