import { BaseException, ExceptionConstructor } from "./BaseException";

export const enum RepoErrorCode {
  NOT_FOUND = "Item was not found in database",
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
