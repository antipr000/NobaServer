import { Inject, Injectable } from "@nestjs/common";
import { NobaWorkflowConfig } from "../../config/configtypes/NobaWorkflowConfig";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import {
  WorkflowClient as TemporalWorkflowClient,
  Connection as TemporalConnection,
  TLSConfig,
} from "@temporalio/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NOBA_WORKFLOW_CONFIG_KEY } from "../../config/ConfigurationUtils";

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
    const tlsSettings: TLSConfig =
      this.workflowConfigs.temporalCloudCertificate && this.workflowConfigs.temporalCloudPrivateKey
        ? {
            clientCertPair: {
              crt: Buffer.from(this.workflowConfigs.temporalCloudCertificate),
              key: Buffer.from(this.workflowConfigs.temporalCloudPrivateKey),
            },
          }
        : undefined;

    const connection = await TemporalConnection.connect({
      tls: tlsSettings,
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

  public async executeDebitConsumerWalletWorkflow(transactionID: string, workflowID: string): Promise<string> {
    return await this.executeWorkflow("DebitConsumerWallet", workflowID, [transactionID]);
  }

  public async executeCreditConsumerWalletWorkflow(transactionID: string, workflowID: string): Promise<string> {
    return await this.executeWorkflow("CreditConsumerWallet", workflowID, [transactionID]);
  }

  public async executeConsumerWalletTransferWorkflow(
    sourceConsumerID: string,
    destinationConsumerID: string,
    amount: number,
    workflowID: string,
  ): Promise<string> {
    return await this.executeWorkflow("ConsumerWalletTransfer", workflowID, [
      sourceConsumerID,
      destinationConsumerID,
      amount,
    ]);
  }
}
