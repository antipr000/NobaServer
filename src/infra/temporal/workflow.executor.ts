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
import { NOBA_CONFIG_KEY, NOBA_WORKFLOW_CONFIG_KEY } from "../../config/ConfigurationUtils";

@Injectable()
export class WorkflowExecutor {
  private workflowConfigs: NobaWorkflowConfig;

  constructor(
    customConfigService: CustomConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.workflowConfigs = customConfigService.get<NobaWorkflowConfig>(NOBA_WORKFLOW_CONFIG_KEY);
  }

  private async executeWorkflow(
    workflowName: string,
    workflowID: string,
    workflowParamsInOrder: any[],
  ): Promise<string> {
    const connection = await TemporalConnection.connect({
      address: this.workflowConfigs.clientUrl,
      connectTimeout: this.workflowConfigs.connectionTimeoutInMs,
    });

    const client = new TemporalWorkflowClient({
      connection,
      namespace: this.workflowConfigs.namespace,
    });

    const handle = await client.start(workflowName, {
      args: [...workflowParamsInOrder],
      taskQueue: this.workflowConfigs.taskQueue,
      workflowId: workflowID,
    });
    this.logger.info(`Started workflow "${workflowName}" with ID: "${handle.workflowId}"`);

    return handle.workflowId;
  }

  public async executeDebitConsumerWalletWorkflow(
    consumerID: string,
    amount: number,
    workflowID: string,
  ): Promise<string> {
    return await this.executeWorkflow("DebitConsumerWallet", workflowID, [consumerID, amount]);
  }

  public async executeCreditConsumerWalletWorkflow(
    consumerID: string,
    amount: number,
    workflowID: string,
  ): Promise<string> {
    return await this.executeWorkflow("CreditConsumerWallet", workflowID, [consumerID, amount]);
  }

  public async executeConsumerWalletTransferWorkflow(
    sourceWalletID: string,
    destinationWalletID: string,
    amount: number,
    workflowID: string,
  ): Promise<string> {
    return await this.executeWorkflow("ConsumerWalletTransfer", workflowID, [
      sourceWalletID,
      destinationWalletID,
      amount,
    ]);
  }
}
