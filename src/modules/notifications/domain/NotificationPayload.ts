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
import { Utils } from "../../../core/utils/Utils";
import { BaseEvent } from "../events/BaseEvent";

export type NotificationPayload =
  | SendDepositCompletedEvent
  | SendDepositFailedEvent
  | SendDepositInitiatedEvent
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
  private static getBaseParams(consumer: Consumer): BaseEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      ...(consumer.props.lastName && { lastName: consumer.props.lastName }),
      nobaUserID: consumer.props.id,
      ...(consumer.props.locale && { locale: consumer.props.locale }),
    };
  }
  static toDepositCompletedEvent(consumer: Consumer, transaction: Transaction): SendDepositCompletedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toDepositCompletedNotificationParameters(transaction),
      locale: consumer.props.locale,
      nobaUserID: consumer.props.id,
    };
  }

  static toDepositFailedEvent(consumer: Consumer, transaction: Transaction): SendDepositFailedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toDepositFailedNotificationParameters(transaction),
      locale: consumer.props.locale,
      nobaUserID: consumer.props.id,
    };
  }

  static toDepositInitiatedEvent(consumer: Consumer, transaction: Transaction): SendDepositInitiatedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toDepositInitiatedNotificationParameters(transaction),
      locale: consumer.props.locale,
    };
  }

  static toDocumentVerificationPendingEvent(consumer: Consumer): SendDocumentVerificationPendingEvent {
    return this.getBaseParams(consumer);
  }

  static toDocumentVerificationRejectedEvent(consumer: Consumer): SendDocumentVerificationRejectedEvent {
    return this.getBaseParams(consumer);
  }

  static toDocumentVerificationTechnicalFailureEvent(
    consumer: Consumer,
  ): SendDocumentVerificationTechnicalFailureEvent {
    return this.getBaseParams(consumer);
  }

  static toEmployerRequestEvent(email: string, firstName: string, lastName: string): SendEmployerRequestEvent {
    return {
      email: email,
      firstName: firstName,
      lastName: lastName,
      locale: "en", // This will always be en as it goes to Kelsi
    };
  }

  static toKycApprovedNonUSEvent(consumer: Consumer): SendKycApprovedNonUSEvent {
    return this.getBaseParams(consumer);
  }

  static toKycApprovedUSEvent(consumer: Consumer): SendKycApprovedUSEvent {
    return this.getBaseParams(consumer);
  }

  static toKycDeniedEvent(consumer: Consumer): SendKycDeniedEvent {
    return this.getBaseParams(consumer);
  }

  static toKycPendingOrFlaggedEvent(consumer: Consumer): SendKycPendingOrFlaggedEvent {
    return this.getBaseParams(consumer);
  }

  static toOtpEvent(otp: string, emailOrPhone: string, consumer?: Consumer): SendOtpEvent {
    const isEmail = Utils.isEmail(emailOrPhone);
    const locale = isEmail || !emailOrPhone.startsWith("+57") ? "en" : "es_co";
    return {
      ...(isEmail ? { email: emailOrPhone } : { phone: emailOrPhone }),
      otp: otp,
      locale: consumer && consumer.props.locale ? consumer.props.locale : locale,
    };
  }

  static toPhoneVerificationCodeEvent(otp: string, phone: string, consumer?: Consumer): SendPhoneVerificationCodeEvent {
    const locale = phone.startsWith("+57") ? "es_co" : "en";
    return {
      phone: phone,
      otp: otp,
      locale: consumer && consumer.props.locale ? consumer.props.locale : locale,
    };
  }

  static toPayrollDepositCompletedEvent(
    consumer: Consumer,
    transaction: Transaction,
    companyName: string,
  ): SendPayrollDepositCompletedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toPayrollDepositCompletedNotificationParameters(
        transaction,
        companyName,
      ),
      locale: consumer.props.locale,
      nobaUserID: consumer.props.id,
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
      firstName: debitConsumer.props.firstName,
      handle: debitConsumer.props.handle,
      params: TransactionNotificationPayloadMapper.toTransferCompletedNotificationParameters(
        transaction,
        debitConsumer,
        creditConsumer,
      ),
      ...(debitConsumer.props.locale && { locale: debitConsumer.props.locale }),
      nobaUserID: debitConsumer.props.id,
    };
  }

  static toTransferFailedEvent(
    debitConsumer: Consumer,
    creditConsumer: Consumer,
    transaction: Transaction,
  ): SendTransferFailedEvent {
    return {
      email: debitConsumer.props.email,
      firstName: debitConsumer.props.firstName,
      handle: debitConsumer.props.handle,
      params: TransactionNotificationPayloadMapper.toTransferFailedNotificationParameters(
        transaction,
        debitConsumer,
        creditConsumer,
      ),
      ...(debitConsumer.props.locale && { locale: debitConsumer.props.locale }),
      nobaUserID: debitConsumer.props.id,
    };
  }

  static toTransferReceivedEvent(
    debitConsumer: Consumer,
    creditConsumer: Consumer,
    transaction: Transaction,
  ): SendTransferReceivedEvent {
    return {
      email: creditConsumer.props.email,
      firstName: creditConsumer.props.firstName,
      handle: creditConsumer.props.handle,
      params: TransactionNotificationPayloadMapper.toTransferReceivedNotificationParameters(
        transaction,
        debitConsumer,
        creditConsumer,
      ),
      ...(creditConsumer.props.locale && { locale: creditConsumer.props.locale }),
      nobaUserID: creditConsumer.props.id,
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
      firstName: consumer.props.firstName,
      nobaUserID: consumer.props.id,
      ...(consumer.props.locale && { locale: consumer.props.locale }),
      walletAddress: walletAddress,
    };
  }

  static toWelcomeMessageEvent(consumer: Consumer): SendWelcomeMessageEvent {
    return {
      email: consumer.props.email,
      ...(consumer.props.locale && { locale: consumer.props.locale }),
    };
  }

  static toWithdrawalCompletedEvent(consumer: Consumer, transaction: Transaction): SendWithdrawalCompletedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toWithdrawalCompletedNotificationParameters(transaction),
      ...(consumer.props.locale && { locale: consumer.props.locale }),
      nobaUserID: consumer.props.id,
    };
  }

  static toWithdrawalFailedEvent(consumer: Consumer, transaction: Transaction): SendWithdrawalFailedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toWithdrawalFailedNotificationParameters(transaction),
      ...(consumer.props.locale && { locale: consumer.props.locale }),
      nobaUserID: consumer.props.id,
    };
  }

  static toWithdrawalInitiatedEvent(consumer: Consumer, transaction: Transaction): SendWithdrawalInitiatedEvent {
    return {
      email: consumer.props.email,
      firstName: consumer.props.firstName,
      handle: consumer.props.handle,
      params: TransactionNotificationPayloadMapper.toWithdrawalInitiatedNotificationParameters(transaction),
      ...(consumer.props.locale && { locale: consumer.props.locale }),
    };
  }
}
