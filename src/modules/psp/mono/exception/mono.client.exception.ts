import { BaseException, ExceptionConstructor } from "../../../../core/exception/base.exception";

export const enum MonoClientErrorCode {
  PHONE_NUMBER_INVALID = "Phone number invalid",
  TRANSFER_NOT_FOUND = "Transfer not found",
  TRANSFER_FAILED = "Transfer failed",
  UNKNOWN = "Unknown error",
  // Maybe add a more robust set of error codes here
}

interface MonoClientExceptionConstructor extends ExceptionConstructor<MonoClientErrorCode> {
  message?: string;
}

export class MonoClientException extends BaseException<MonoClientErrorCode> {
  constructor(params: MonoClientExceptionConstructor) {
    super({
      message: params.message ?? params.errorCode,
      errorCode: params.errorCode,
      retry: params.retry,
      severity: params.severity,
      error: params.error,
    });
  }
}
