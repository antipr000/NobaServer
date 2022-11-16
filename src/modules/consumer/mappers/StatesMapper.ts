import { Consumer } from "../domain/Consumer";
import { CryptoWallet } from "../domain/CryptoWallet";
import {
  AggregatedPaymentMethodState,
  AggregatedWalletState,
  DocumentVerificationErrorReason,
  DocumentVerificationState,
  KycVerificationState,
  UserState,
} from "../domain/ExternalStates";
import { PaymentMethod } from "../domain/PaymentMethod";
import { DocumentVerificationStatus, KYCStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";

export class StatesMapper {
  private getAggregatedWalletStatus(wallets: CryptoWallet[]): WalletStatus {
    // Filter out wallets that has not been deleted
    wallets = wallets.filter(wallet => wallet.status !== WalletStatus.DELETED);

    // At least one wallet is rejected
    if (wallets.filter(wallet => wallet.status === WalletStatus.REJECTED).length > 0) {
      return WalletStatus.REJECTED;
    } else if (wallets.filter(wallet => wallet.status === WalletStatus.FLAGGED).length > 0) {
      // We do not count wallets with PENDING status as it means the otp verification is not completed. This should not block the consumer from transacting using APPROVED wallets
      return WalletStatus.PENDING;
    } else if (wallets.length > 0) {
      return WalletStatus.APPROVED;
    } else return null;
  }

  private getAggregatedPaymentMethodStatus(paymentMethods: PaymentMethod[]): PaymentMethodStatus {
    // Filter out payment methods that has not been deleted
    paymentMethods = paymentMethods.filter(paymentMethod => paymentMethod.status !== PaymentMethodStatus.DELETED);

    if (paymentMethods.filter(paymentMethod => paymentMethod.status === PaymentMethodStatus.REJECTED).length > 0) {
      return PaymentMethodStatus.REJECTED;
    }
    if (paymentMethods.length === 0) return null;
    const numApproved = paymentMethods.filter(
      paymentMethod => paymentMethod.status && paymentMethod.status === PaymentMethodStatus.APPROVED,
    ).length;
    if (numApproved === paymentMethods.length) return PaymentMethodStatus.APPROVED;
    else return PaymentMethodStatus.FLAGGED;
  }

  getPaymentMethodState(paymentMethods: PaymentMethod[]): AggregatedPaymentMethodState {
    const paymentMethodStatus = this.getAggregatedPaymentMethodStatus(paymentMethods);

    switch (paymentMethodStatus) {
      case PaymentMethodStatus.APPROVED:
        return AggregatedPaymentMethodState.APPROVED;
      case PaymentMethodStatus.FLAGGED:
        return AggregatedPaymentMethodState.PENDING;
      default:
        return AggregatedPaymentMethodState.NOT_SUBMITTED;
    }
  }

  getWalletState(wallets: CryptoWallet[]): AggregatedWalletState {
    const status = this.getAggregatedWalletStatus(wallets);

    switch (status) {
      case WalletStatus.APPROVED:
        return AggregatedWalletState.APPROVED;
      case WalletStatus.PENDING:
        return AggregatedWalletState.PENDING;
      default:
        return AggregatedWalletState.NOT_SUBMITTED;
    }
  }

  getKycVerificationState(status: KYCStatus): KycVerificationState {
    switch (status) {
      case KYCStatus.APPROVED:
        return KycVerificationState.APPROVED;
      case KYCStatus.PENDING:
      case KYCStatus.FLAGGED:
        return KycVerificationState.PENDING;
      case KYCStatus.NOT_SUBMITTED:
        return KycVerificationState.NOT_SUBMITTED;
      case KYCStatus.REJECTED:
        return KycVerificationState.REJECTED;
    }
  }

  getDocumentVerificationState(
    status: DocumentVerificationStatus,
  ): [DocumentVerificationState, DocumentVerificationErrorReason] {
    if (status === DocumentVerificationStatus.APPROVED || status === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED) {
      return [DocumentVerificationState.VERIFIED, null];
    } else if (status === DocumentVerificationStatus.NOT_REQUIRED) {
      return [DocumentVerificationState.NOT_REQUIRED, null];
    } else if (status === DocumentVerificationStatus.PENDING) {
      return [DocumentVerificationState.PENDING, null];
    } else if (status === DocumentVerificationStatus.REQUIRED) {
      return [DocumentVerificationState.NOT_SUBMITTED, null];
    } else if (status === DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE) {
      return [DocumentVerificationState.ACTION_REQUIRED, DocumentVerificationErrorReason.SIZE_OR_TYPE];
    } else if (status === DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY) {
      return [DocumentVerificationState.ACTION_REQUIRED, DocumentVerificationErrorReason.POOR_QUALITY];
    } else if (status === DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE) {
      return [DocumentVerificationState.ACTION_REQUIRED, DocumentVerificationErrorReason.REQUIRES_RECAPTURE];
    } else if (status === DocumentVerificationStatus.REJECTED) {
      return [DocumentVerificationState.REJECTED, null];
    }
  }

  getUserState(consumer: Consumer): UserState {
    const paymentMethodStatus = this.getAggregatedPaymentMethodStatus(consumer.props.paymentMethods);
    const walletStatus = this.getAggregatedWalletStatus(consumer.props.cryptoWallets);

    const identityVerificationStatus =
      consumer.props.verificationData?.kycVerificationStatus ?? KYCStatus.NOT_SUBMITTED;

    const identityVerificationState = this.getKycVerificationState(identityVerificationStatus);

    const documentVerificationStatus =
      consumer.props.verificationData?.documentVerificationStatus ?? DocumentVerificationStatus.NOT_REQUIRED;

    const [documentVerificationState, _] = this.getDocumentVerificationState(documentVerificationStatus);

    if (
      consumer.props.isLocked ||
      identityVerificationStatus === KYCStatus.REJECTED ||
      documentVerificationState === DocumentVerificationState.REJECTED ||
      walletStatus === WalletStatus.REJECTED ||
      paymentMethodStatus === PaymentMethodStatus.REJECTED
    ) {
      return UserState.PERMANENT_HOLD;
    }

    if (consumer.props.isDisabled || consumer.props.isSuspectedFraud) {
      return UserState.TEMPORARY_HOLD;
    }

    if (
      identityVerificationState === KycVerificationState.APPROVED &&
      (documentVerificationState === DocumentVerificationState.VERIFIED ||
        documentVerificationState === DocumentVerificationState.NOT_REQUIRED) &&
      paymentMethodStatus === PaymentMethodStatus.APPROVED &&
      walletStatus === WalletStatus.APPROVED
    ) {
      return UserState.APPROVED;
    } else if (
      documentVerificationState === DocumentVerificationState.ACTION_REQUIRED ||
      identityVerificationState === KycVerificationState.NOT_SUBMITTED ||
      walletStatus === null ||
      paymentMethodStatus === null
    ) {
      return UserState.ACTION_REQUIRED;
    }

    return UserState.PENDING;
  }
}
