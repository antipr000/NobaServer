import { Consumer } from "../../../modules/consumer/domain/Consumer";

import { SendDepositCompletedEvent } from "../events/SendDepositCompletedEvent";
import { SendDepositFailedEvent } from "../events/SendDepositFailedEvent";
import { SendDepositInitiatedEvent } from "../events/SendDepositInitiatedEvent";
import { SendPayrollDepositCompletedEvent } from "../events/SendPayrollDepositCompletedEvent";
import { SendDocumentVerificationPendingEvent } from "../events/SendDocumentVerificationPendingEvent";
import { SendDocumentVerificationRejectedEvent } from "../events/SendDocumentVerificationRejectedEvent";
import { SendDocumentVerificationTechnicalFailureEvent } from "../events/SendDocumentVerificationTechnicalFailureEvent";
import { SendEmployerRequestEvent } from "../events/SendEmployerRequestEvent";
import { SendKycApprovedNonUSEvent } from "../events/SendKycApprovedNonUSEvent";
import { SendKycApprovedUSEvent } from "../events/SendKycApprovedUSEvent";
import { SendKycDeniedEvent } from "../events/SendKycDeniedEvent";
import { SendKycPendingOrFlaggedEvent } from "../events/SendKycPendingOrFlaggedEvent";
import { SendOtpEvent } from "../events/SendOtpEvent";
import { SendPhoneVerificationCodeEvent } from "../events/SendPhoneVerificationCodeEvent";
import { SendRegisterNewEmployeeEvent } from "../events/SendRegisterNewEmployeeEvent";
import { SendTransferCompletedEvent } from "../events/SendTransferCompletedEvent";
import { SendTransferFailedEvent } from "../events/SendTransferFailedEvent";
import { SendTransferReceivedEvent } from "../events/SendTransferReceivedEvent";
import { SendUpdateEmployeeAllocationAmountEvent } from "../events/SendUpdateEmployeeAllocationAmountEvent";
import { SendUpdatePayrollStatusEvent } from "../events/SendUpdatePayrollStatusEvent";
import { SendWalletUpdateVerificationCodeEvent } from "../events/SendWalletUpdateVerificationCodeEvent";
import { SendWelcomeMessageEvent } from "../events/SendWelcomeMessageEvent";
import { SendWithdrawalCompletedEvent } from "../events/SendWithdrawalCompletedEvent";
import { SendWithdrawalFailedEvent } from "../events/SendWithdrawalFailedEvent";
import { SendWithdrawalInitiatedEvent } from "../events/SendWithdrawalInitiatedEvent";
import { Transaction } from "../../../modules/transaction/domain/Transaction";
import { TransactionNotificationPayloadMapper } from "./TransactionNotificationParameters";
import { Employee } from "../../../modules/employee/domain/Employee";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";

export type NotificationPayload =
  | SendDepositCompletedEvent
  | SendDepositFailedEvent
  | SendDepositInitiatedEvent
  | SendDepositCompletedEvent
  | SendDepositFailedEvent
  | SendPayrollDepositCompletedEvent
  | SendDocumentVerificationPendingEvent
  | SendDocumentVerificationRejectedEvent
  | SendDocumentVerificationTechnicalFailureEvent
  | SendEmployerRequestEvent
  | SendKycApprovedNonUSEvent
  | SendKycApprovedUSEvent
  | SendKycDeniedEvent
  | SendKycPendingOrFlaggedEvent
  | SendOtpEvent
  | SendPhoneVerificationCodeEvent
  | SendRegisterNewEmployeeEvent
  | SendTransferCompletedEvent
  | SendTransferFailedEvent
  | SendTransferReceivedEvent
  | SendUpdateEmployeeAllocationAmountEvent
  | SendUpdatePayrollStatusEvent
  | SendWalletUpdateVerificationCodeEvent
  | SendWelcomeMessageEvent
  | SendWithdrawalCompletedEvent
  | SendWithdrawalFailedEvent
  | SendWithdrawalInitiatedEvent;

export class NotificationPayloadMapper {
  static toDepositCompletedEvent(consumer: Consumer, transaction: Transaction): SendDepositCompletedEvent {
    return {
      email: consumer.props.email,
      name: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toDepositCompletedNotificationParameters(transaction),
      locale: consumer.props.locale,
    };
  }

  static toDepositFailedEvent(consumer: Consumer, transaction: Transaction): SendDepositFailedEvent {
    return {
      email: consumer.props.email,
      name: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toDepositFailedNotificationParameters(transaction),
      locale: consumer.props.locale,
    };
  }

  static toDepositInitiatedEvent(consumer: Consumer, transaction: Transaction): SendDepositInitiatedEvent {
    return {
      email: consumer.props.email,
      name: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toDepositInitiatedNotificationParameters(transaction),
      locale: consumer.props.locale,
    };
  }

  static toDocumentVerificationPendingEvent(consumer: Consumer): SendDocumentVerificationPendingEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props.id,
      locale: consumer.props.locale,
    };
  }

  static toDocumentVerificationRejectedEvent(consumer: Consumer): SendDocumentVerificationRejectedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props.id,
      locale: consumer.props.locale,
    };
  }

  static toDocumentVerificationTechnicalFailureEvent(
    consumer: Consumer,
  ): SendDocumentVerificationTechnicalFailureEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props.id,
      locale: consumer.props.locale,
    };
  }

  static toEmployerRequestEvent(consumer: Consumer): SendEmployerRequestEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      locale: consumer.props.locale,
    };
  }

  static toKycApprovedNonUSEvent(consumer: Consumer): SendKycApprovedNonUSEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props.id,
      locale: consumer.props.locale,
    };
  }

  static toKycApprovedUSEvent(consumer: Consumer): SendKycApprovedUSEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props.id,
      locale: consumer.props.locale,
    };
  }

  static toKycDeniedEvent(consumer: Consumer): SendKycDeniedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props.id,
      locale: consumer.props.locale,
    };
  }

  static toKycPendingOrFlaggedEvent(consumer: Consumer): SendKycPendingOrFlaggedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      nobaUserID: consumer.props.id,
      locale: consumer.props.locale,
    };
  }

  static toOtpEvent(consumer: Consumer, otp: string, email?: string, phone?: string): SendOtpEvent {
    return {
      ...(email && { email: email }),
      ...(phone && { phone: phone }),
      otp: otp,
      ...(consumer.props.firstName && { name: consumer.props.firstName }),
      ...(consumer.props.handle && { handle: consumer.props.handle }),
      locale: consumer.props.locale,
    };
  }

  static toPhoneVerificationCodeEvent(consumer: Consumer, otp: string, phone: string): SendPhoneVerificationCodeEvent {
    return {
      phone: phone,
      otp: otp,
      ...(consumer.props.firstName && { name: consumer.props.firstName }),
      ...(consumer.props.handle && { handle: consumer.props.handle }),
      locale: consumer.props.locale,
    };
  }

  static toPayrollDepositCompletedEvent(
    consumer: Consumer,
    transaction: Transaction,
    companyName: string,
  ): SendPayrollDepositCompletedEvent {
    return {
      email: consumer.props.email,
      name: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toPayrollDepositCompletedNotificationParameters(
        transaction,
        companyName,
      ),
      locale: consumer.props.locale,
    };
  }

  static toRegisterNewEmployeeEvent(consumer: Consumer, employee: Employee): SendRegisterNewEmployeeEvent {
    return {
      ...(consumer.props.firstName && { firstName: consumer.props.firstName }),
      ...(consumer.props.lastName && { lastName: consumer.props.lastName }),
      ...(consumer.props.email && { email: consumer.props.email }),
      ...(consumer.props.phone && { phone: consumer.props.phone }),
      employerReferralID: employee.employer.referralID,
      allocationAmountInPesos: employee.allocationAmount,
      nobaEmployeeID: employee.id,
      ...(consumer.props.locale && { locale: consumer.props.locale }),
    };
  }

  static toTransferCompletedEvent(
    debitConsumer: Consumer,
    creditConsumer: Consumer,
    transaction: Transaction,
  ): SendTransferCompletedEvent {
    return {
      email: debitConsumer.props.email,
      name: debitConsumer.props.firstName,
      handle: debitConsumer.props.handle,
      params: TransactionNotificationPayloadMapper.toTransferCompletedNotificationParameters(
        transaction,
        debitConsumer,
        creditConsumer,
      ),
      ...(debitConsumer.props.locale && { locale: debitConsumer.props.locale }),
    };
  }

  static toTransferFailedEvent(
    debitConsumer: Consumer,
    creditConsumer: Consumer,
    transaction: Transaction,
  ): SendTransferFailedEvent {
    return {
      email: debitConsumer.props.email,
      name: debitConsumer.props.firstName,
      handle: debitConsumer.props.handle,
      params: TransactionNotificationPayloadMapper.toTransferFailedNotificationParameters(
        transaction,
        debitConsumer,
        creditConsumer,
      ),
      ...(debitConsumer.props.locale && { locale: debitConsumer.props.locale }),
    };
  }

  static toTransferReceivedEvent(
    debitConsumer: Consumer,
    creditConsumer: Consumer,
    transaction: Transaction,
  ): SendTransferReceivedEvent {
    return {
      email: creditConsumer.props.email,
      name: creditConsumer.props.firstName,
      handle: creditConsumer.props.handle,
      params: TransactionNotificationPayloadMapper.toTransferReceivedNotificationParameters(
        transaction,
        debitConsumer,
        creditConsumer,
      ),
      ...(creditConsumer.props.locale && { locale: creditConsumer.props.locale }),
    };
  }

  static toUpdateEmployeeAllocationAmountEvent(
    employeeID: string,
    allocationAmount: number,
  ): SendUpdateEmployeeAllocationAmountEvent {
    return {
      nobaEmployeeID: employeeID,
      allocationAmountInPesos: allocationAmount,
    };
  }

  static toUpdatePayrollStatusEvent(payrollID: string, payrollStatus: PayrollStatus): SendUpdatePayrollStatusEvent {
    return {
      nobaPayrollID: payrollID,
      payrollStatus: payrollStatus,
    };
  }

  static toWalletUpdateVerificationCodeEvent(
    consumer: Consumer,
    otp: string,
    walletAddress: string,
  ): SendWalletUpdateVerificationCodeEvent {
    return {
      ...(consumer.props.email && { email: consumer.props.email }),
      ...(consumer.props.phone && { phone: consumer.props.phone }),
      otp: otp,
      name: consumer.props.firstName,
      nobaUserID: consumer.props.id,
      ...(consumer.props.locale && { locale: consumer.props.locale }),
      walletAddress: walletAddress,
    };
  }

  static toWelcomeMessageEvent(consumer: Consumer): SendWelcomeMessageEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      lastName: consumer.props.lastName,
      ...(consumer.props.locale && { locale: consumer.props.locale }),
      nobaUserID: consumer.props.id,
    };
  }

  static toWithdrawalCompletedEvent(consumer: Consumer, transaction: Transaction): SendWithdrawalCompletedEvent {
    return {
      email: consumer.props.email,
      name: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toWithdrawalCompletedNotificationParameters(transaction),
      ...(consumer.props.locale && { locale: consumer.props.locale }),
    };
  }

  static toWithdrawalFailedEvent(consumer: Consumer, transaction: Transaction): SendWithdrawalFailedEvent {
    return {
      email: consumer.props.email,
      name: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toWithdrawalFailedNotificationParameters(transaction),
      ...(consumer.props.locale && { locale: consumer.props.locale }),
    };
  }

  static toWithdrawalInitiatedEvent(consumer: Consumer, transaction: Transaction): SendWithdrawalInitiatedEvent {
    return {
      email: consumer.props.email,
      name: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toWithdrawalInitiatedNotificationParameters(transaction),
      ...(consumer.props.locale && { locale: consumer.props.locale }),
    };
  }
}
