import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { MonoTransactionState } from "../domain/Mono";

export const convertExternalTransactionStateToInternalState = (state: string): MonoTransactionState => {
  const externalTransactionStateToInternalState: Record<string, MonoTransactionState> = {
    created: MonoTransactionState.PENDING,
    in_progress: MonoTransactionState.IN_PROGRESS,
    approved: MonoTransactionState.SUCCESS,
    declined: MonoTransactionState.DECLINED,
    cancelled: MonoTransactionState.CANCELLED,
    duplicated: MonoTransactionState.DUPLICATED,
  };

  if (!externalTransactionStateToInternalState[state]) {
    throw new ServiceException({
      errorCode: ServiceErrorCode.UNKNOWN,
      message: `Unknown Mono transfer state: ${state}`,
    });
  }
  return externalTransactionStateToInternalState[state];
};
