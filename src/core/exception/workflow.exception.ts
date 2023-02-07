import { BaseException, ExceptionConstructor } from "./base.exception";

export const enum WorkflowErrorCode {
  UNKNOWN = "Unknown error has occured",
}

interface WorkflowExceptionConstructor extends ExceptionConstructor<WorkflowErrorCode> {
  message?: string;
}

export class WorkflowException extends BaseException<WorkflowErrorCode> {
  constructor(params: WorkflowExceptionConstructor) {
    super({
      message: params.message ?? params.errorCode,
      errorCode: params.errorCode,
      retry: params.retry,
      severity: params.severity,
      error: params.error,
    });
  }
}
