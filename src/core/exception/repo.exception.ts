import { BaseException, ExceptionConstructor } from "./base.exception";

export const enum RepoErrorCode {
  NOT_FOUND = "Item was not found in database",
  INVALID_DATABASE_RECORD = "Invalid database record",
  DATABASE_INTERNAL_ERROR = "Database internal error",
  UNKNOWN = "Unknown error has occured",
}

interface ServiceExceptionConstructor extends ExceptionConstructor<RepoErrorCode> {
  message?: string;
}

export class RepoException extends BaseException<RepoErrorCode> {
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
