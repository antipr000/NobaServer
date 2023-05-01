import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { MonoTransaction, MonoTransactionState } from "../domain/Mono";
import { IMonoRepo } from "../repo/mono.repo";
import { MONO_REPO_PROVIDER } from "../repo/mono.repo.module";
import { ConsumerService } from "../../consumer/consumer.service";
import { MonoWebhookMappers } from "../webhook/mono.webhook.mapper";
import { KmsService } from "../../common/kms.service";
import { AlertKey } from "../../common/alerts/alert.dto";
import { AlertService } from "../../common/alerts/alert.service";
import {
  BankTransferApprovedEvent,
  BankTransferRejectedEvent,
  CollectionIntentCreditedEvent,
  MonoAccountCreditedEvent,
} from "../dto/mono.webhook.dto";
import { Payroll, PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { EmployerService } from "../../../modules/employer/employer.service";

// TODO: Remove the dependency on the MonoRepo by going via MonoService
@Injectable()
export class MonoWebhookService {
  @Inject()
  protected readonly kmsService: KmsService;

  @Inject(MONO_REPO_PROVIDER)
  protected readonly monoRepo: IMonoRepo;

  @Inject(WINSTON_MODULE_PROVIDER)
  protected readonly logger: Logger;

  @Inject()
  protected readonly consumerService: ConsumerService;

  @Inject()
  protected readonly monoWebhookMappers: MonoWebhookMappers;

  @Inject()
  private readonly alertService: AlertService;

  @Inject()
  private readonly employerService: EmployerService;

  async processWebhookEvent(requestBody: Record<string, any>, monoSignature: string): Promise<void> {
    switch (requestBody.event.type) {
      case "collection_intent_credited":
        await this.processCollectionIntentCreditedEvent(
          this.monoWebhookMappers.convertCollectionLinkCredited(requestBody, monoSignature),
        );
        break;

      case "bank_transfer_approved":
        await this.processBankTransferApprovedEvent(
          this.monoWebhookMappers.convertBankTransferApproved(requestBody, monoSignature),
        );
        break;

      case "bank_transfer_rejected":
        await this.processBankTransferRejectedEvent(
          this.monoWebhookMappers.convertBankTransferRejected(requestBody, monoSignature),
        );
        break;

      case "account_credited":
        await this.processAccountCreditedEvent(
          this.monoWebhookMappers.convertAccountCredited(requestBody, monoSignature),
        );
        break;

      case "batch_sent":
        this.logger.info(
          `Received ${requestBody.event.type} webhook event (silently ignoring): ${JSON.stringify(requestBody)}`,
        );
        break;

      default:
        // Writing a logger.error is enough as throwing an error will cause the webhook to be retried
        this.logger.error(`Unexpected Mono webhook event: ${JSON.stringify(requestBody)}`);
    }
  }

  private async processCollectionIntentCreditedEvent(event: CollectionIntentCreditedEvent): Promise<void> {
    const monoTransaction: MonoTransaction | null = await this.monoRepo.getMonoTransactionByCollectionLinkID(
      event.collectionLinkID,
    );
    if (!monoTransaction) {
      this.alertService.raiseAlert({
        key: AlertKey.MONO_TRANSACTION_NOT_FOUND,
        message: `Failed to find Mono collection record with ID ${event.collectionLinkID}`,
      });
      return;
    }

    // TODO: Verify that the amount and currency match the expected amount and currency.

    await this.monoRepo.updateMonoTransaction(monoTransaction.id, {
      monoPaymentTransactionID: event.monoTransactionID,
      state: MonoTransactionState.SUCCESS,
    });
  }

  private async processBankTransferApprovedEvent(event: BankTransferApprovedEvent): Promise<void> {
    const monoTransaction: MonoTransaction | null = await this.monoRepo.getMonoTransactionByTransferID(
      event.transferID,
    );

    if (!monoTransaction) {
      this.alertService.raiseAlert({
        key: AlertKey.MONO_TRANSACTION_NOT_FOUND,
        message: `Failed to find Mono transfer record with ID ${event.transferID}`,
      });
      return;
    }

    // TODO: Verify that the amount and currency match the expected amount and currency (maybe?)
    await this.monoRepo.updateMonoTransaction(monoTransaction.id, {
      state: MonoTransactionState.SUCCESS,
    });
  }

  private async processBankTransferRejectedEvent(event: BankTransferRejectedEvent): Promise<void> {
    const monoTransaction: MonoTransaction | null = await this.monoRepo.getMonoTransactionByTransferID(
      event.transferID,
    );

    if (!monoTransaction) {
      this.alertService.raiseAlert({
        key: AlertKey.MONO_TRANSACTION_NOT_FOUND,
        message: `Failed to find Mono transfer record (for reject) with ID ${event.transferID}`,
      });
      return;
    }

    await this.monoRepo.updateMonoTransaction(monoTransaction.id, {
      state: event.state,
      declinationReason: event.declinationReason,
    });
  }

  private async processAccountCreditedEvent(event: MonoAccountCreditedEvent): Promise<void> {
    let matchingDocumentNumberPayrolls: Payroll[] = [];
    if (event.payerDocumentNumber) {
      matchingDocumentNumberPayrolls =
        await this.employerService.getInvoicedPayrollMatchingAmountAndEmployerDocumentNumber(
          event.amount,
          event.payerDocumentNumber,
        );
    }
    if (matchingDocumentNumberPayrolls.length === 1) {
      await this.employerService.updatePayroll(matchingDocumentNumberPayrolls[0].id, {
        status: PayrollStatus.FUNDED,
        paymentMonoTransactionID: event.transactionID,
      });
      return;
    }

    let matchingBankNamePayrolls: Payroll[] = [];
    if (event.payerName) {
      matchingBankNamePayrolls =
        await this.employerService.getInvoicedPayrollMatchingAmountAndEmployerDepositMatchingName(
          event.amount,
          event.payerName,
        );
    }
    if (matchingBankNamePayrolls.length === 1) {
      await this.employerService.updatePayroll(matchingBankNamePayrolls[0].id, {
        status: PayrollStatus.FUNDED,
        paymentMonoTransactionID: event.transactionID,
      });
      return;
    }

    const matchingBothPayrolls: Payroll[] = matchingDocumentNumberPayrolls.filter((payroll: Payroll) => {
      return matchingBankNamePayrolls.findIndex(payroll2 => payroll2.id === payroll.id) !== -1;
    });
    if (matchingBothPayrolls.length === 1) {
      await this.employerService.updatePayroll(matchingBothPayrolls[0].id, {
        status: PayrollStatus.FUNDED,
        paymentMonoTransactionID: event.transactionID,
      });
      return;
    }

    this.alertService.raiseAlert({
      key: AlertKey.UNMATCHED_ACCOUNT_CREDITED_MONO_EVENT,
      message: `Unmatched event: "${JSON.stringify(event)}"`,
    });
  }
}
