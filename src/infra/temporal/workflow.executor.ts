import { Inject, Injectable } from "@nestjs/common";
import { NobaWorkflowConfig } from "../../config/configtypes/NobaWorkflowConfig";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { WorkflowClient, TLSConfig, Connection } from "@temporalio/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NOBA_WORKFLOW_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { WorkflowName } from "./workflow";
import { AlertKey } from "../../modules/common/alerts/alert.dto";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { HealthCheckResponse, HealthCheckStatus } from "../../core/domain/HealthCheckTypes";
import { Utils } from "../../core/utils/Utils";
import { AlertService } from "../../modules/common/alerts/alert.service";

@Injectable()
export class WorkflowExecutor {
  private static CONNECTION_ATTEMPTS = 5;
  private static RETRY_INTERVAL = 3000; // 3 seconds
  private static HEALTH_CHECK_WORKFLOW_NAME = "HealthCheck";
  private workflowConfigs: NobaWorkflowConfig;
  private connection: Connection;
  private client: WorkflowClient;

  constructor(
    customConfigService: CustomConfigService,
    private readonly alertService: AlertService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.workflowConfigs = customConfigService.get<NobaWorkflowConfig>(NOBA_WORKFLOW_CONFIG_KEY);
  }

  /**
   * Initiates a connection to Temporal. Returns true if success or false if failure. The return
   * value is
   * @param workflowName
   */
  public async init(workflowName: string): Promise<boolean> {
    // Already initialized
    if (this.client) {
      return true;
    }

    let attemptCount = 1;
    while (attemptCount <= WorkflowExecutor.CONNECTION_ATTEMPTS) {
      try {
        const tlsSettings: TLSConfig =
          this.workflowConfigs.temporalCloudCertificate && this.workflowConfigs.temporalCloudPrivateKey
            ? {
                clientCertPair: {
                  crt: Buffer.from(this.workflowConfigs.temporalCloudCertificate),
                  key: Buffer.from(this.workflowConfigs.temporalCloudPrivateKey),
                },
              }
            : undefined;

        this.logger.info(
          `Connecting to Temporal instance at ${this.workflowConfigs.clientUrl} for workflow ${workflowName}`,
        );
        this.connection = await Connection.connect({
          tls: tlsSettings,
          address: this.workflowConfigs.clientUrl,
          connectTimeout: this.workflowConfigs.connectionTimeoutInMs,
        });

        this.client = new WorkflowClient({
          connection: this.connection,
          namespace: this.workflowConfigs.namespace,
        });

        return true;
      } catch (error) {
        if (attemptCount < WorkflowExecutor.CONNECTION_ATTEMPTS) {
          this.reset();
          this.logger.warn(
            `Unable to connect to Temporal server for workflow ${workflowName}! Retrying in ${
              WorkflowExecutor.RETRY_INTERVAL / 1000
            } seconds (${attemptCount}/${WorkflowExecutor.CONNECTION_ATTEMPTS - 1})...`,
          );
          await Utils.sleep(WorkflowExecutor.RETRY_INTERVAL);
          attemptCount++;
        } else {
          this.alertService.raiseAlert({
            key: AlertKey.TEMPORAL_DOWN,
            message: `Failed to connect to Temporal for workflow ${workflowName} with error: ${error}`,
          });
          return false;
        }
      }
    }
  }

  private reset() {
    this.client = null;
    this.connection = null;
  }

  async getHealth(): Promise<HealthCheckResponse> {
    let healthResponse;
    try {
      if (await this.init(WorkflowExecutor.HEALTH_CHECK_WORKFLOW_NAME)) {
        healthResponse = await this.connection.healthService.check({});

        /*
          UNKNOWN = 0,
          SERVING = 1,
          NOT_SERVING = 2,
          SERVICE_UNKNOWN = 3
        */

        if (healthResponse.status == 1) return { status: HealthCheckStatus.OK };
      }
    } catch (error) {
      this.logger.error("Temporal health check failed with response: " + JSON.stringify(healthResponse));
    }

    return { status: HealthCheckStatus.UNAVAILABLE };
  }

  private async executeWorkflow(
    workflowName: string,
    workflowID: string,
    workflowParamsInOrder: any[],
  ): Promise<string> {
    // Returns true if already initialized or if successfully initialized
    const initialized = await this.init(workflowName);
    if (initialized) {
      const handle = await this.client.start(workflowName, {
        args: [...workflowParamsInOrder],
        taskQueue: this.workflowConfigs.taskQueue,
        workflowId: workflowID,
      });
      this.logger.info(`Started workflow "${workflowName}" with ID: "${handle.workflowId}"`);
      return handle.workflowId;
    } else {
      throw Error("Unable to connect"); // Will be caught by executeWorkflowWrapper
    }
  }

  private async executeWorkflowWrapper(
    workflowName: string,
    workflowID: string,
    workflowParamsInOrder: any[],
  ): Promise<string> {
    try {
      return await this.executeWorkflow(workflowName, workflowID, workflowParamsInOrder);
    } catch (error) {
      // Retry once if we get a connection error
      this.reset();
      this.logger.warn(
        `First attempted to execute workflow ${workflowName} failed. Resetting connection and trying again...`,
      );
      try {
        return await this.executeWorkflow(workflowName, workflowID, workflowParamsInOrder);
      } catch (error) {
        throw new ServiceException({
          message: "Unable to contact workflow server",
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
        });
      }
    }
  }

  public async executeWalletWithdrawalWorkflow(transactionID: string, workflowID: string): Promise<string> {
    return await this.executeWorkflowWrapper(WorkflowName.WALLET_WITHDRAWAL, workflowID, [transactionID]);
  }

  public async executeWalletDepositWorkflow(transactionID: string, workflowID: string): Promise<string> {
    return await this.executeWorkflowWrapper(WorkflowName.WALLET_DEPOSIT, workflowID, [transactionID]);
  }

  public async executeWalletTransferWorkflow(transactionID: string, workflowID: string): Promise<string> {
    return await this.executeWorkflowWrapper(WorkflowName.WALLET_TRANSFER, workflowID, [transactionID]);
  }

  public async executePayrollProcessingWorkflow(
    payrollID: string,
    companyName: string,
    payrollDate: string,
    workflowID: string,
  ): Promise<string> {
    return await this.executeWorkflowWrapper(WorkflowName.PAYROLL_PROCESSING, workflowID, [
      { payrollID: payrollID, companyName: companyName, payrollDate: payrollDate },
    ]);
  }

  public async executeBulkInviteEmployeesWorkflow(
    employerID: string,
    bucketName: string,
    bucketPath: string,
    workflowID: string,
  ): Promise<string> {
    return await this.executeWorkflowWrapper(WorkflowName.BULK_ADD_EMPLOYEES, workflowID, [
      employerID,
      bucketName,
      bucketPath,
    ]);
  }

  public async executeCreditAdjustmentWorkflow(transactionID: string, workflowID: string): Promise<string> {
    return await this.executeWorkflowWrapper(WorkflowName.CREDIT_ADJUSTMENT, workflowID, [transactionID]);
  }

  public async executeDebitAdjustmentWorkflow(transactionID: string, workflowID: string): Promise<string> {
    return await this.executeWorkflowWrapper(WorkflowName.DEBIT_ADJUSTMENT, workflowID, [transactionID]);
  }
}
