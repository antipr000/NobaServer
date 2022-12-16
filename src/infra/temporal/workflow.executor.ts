import { Inject, Injectable } from "@nestjs/common";
import { NobaWorkflowConfig } from "../../config/configtypes/NobaWorkflowConfig";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import {
  WorkflowClient as TemporalWorkflowClient,
  Connection as TemporalConnection,
  ConnectionOptions as TemporalConnectionOptions,
} from "@temporalio/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class WorkflowExecutor {
  private workflowConfigs: NobaWorkflowConfig;

  constructor(
    customConfigService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.workflowConfigs = customConfigService.get<NobaWorkflowConfig>("NobaWorkflowConfig");
  }

  private async executeWorkflow(workflowName: string, workflowID: string, params): Promise<string> {
    const connection = await TemporalConnection.connect({
      address: this.workflowConfigs.clientUrl,
      connectTimeout: this.workflowConfigs.connectionTimeoutInMs,
    });

    const client = new TemporalWorkflowClient({
      connection,
      namespace: this.workflowConfigs.namespace,
    });

    const handle = await client.start(workflowName, {
      args: [params],
      taskQueue: this.workflowConfigs.taskQueue,
      workflowId: workflowID,
    });
    this.logger.info(`Started workflow "${workflowName}" with ID: "${handle.workflowId}"`);

    return handle.workflowId;
  }

  public async executeDebitConsumerWalletWorkflow(
    consumerId: string,
    amountToTransact: number,
    workflowID: string,
  ): Promise<string> {
    return await this.executeWorkflow("DebitConsumerWallet", workflowID, { consumerId, amount: amountToTransact });
  }
}
