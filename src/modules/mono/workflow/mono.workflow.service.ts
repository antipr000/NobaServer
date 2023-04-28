import { Injectable } from "@nestjs/common";
import { WorkflowErrorCode, WorkflowException } from "../../../core/exception/workflow.exception";
import { MonoTransaction } from "../domain/Mono";
import { CreateMonoTransactionRequest } from "../dto/mono.service.dto";
import { MonoClientException } from "../exception/mono.client.exception";
import { MonoService } from "../public/mono.service";

@Injectable()
export class MonoWorkflowService extends MonoService {
  async createMonoTransaction(request: CreateMonoTransactionRequest): Promise<MonoTransaction> {
    try {
      return await super.createMonoTransaction(request);
    } catch (e) {
      if (e instanceof MonoClientException) {
        throw new WorkflowException({
          errorCode: WorkflowErrorCode.TRANSACTION_FAILED,
          message: e.message,
        });
      }
      throw e;
    }
  }
}
