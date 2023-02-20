import { BaseException, ExceptionConstructor, MessageFormat } from "./base.exception";

export const enum WorkflowErrorCode {
  TRANSACTION_FAILED = "Transaction failed",
  UNKNOWN = "Unknown error has occured",
}

interface WorkflowExceptionConstructor extends ExceptionConstructor<WorkflowErrorCode> {
  message?: string;
}

export class WorkflowException extends BaseException<WorkflowErrorCode> {
  constructor(params: WorkflowExceptionConstructor) {
    super({
      message: params.message ?? params.errorCode,
      messageFormat: params.messageFormat ?? MessageFormat.JSON,
      errorCode: params.errorCode,
      retry: params.retry,
      severity: params.severity,
      error: params.error,
    });

    Object.setPrototypeOf(this, WorkflowException.prototype);
  }
}
