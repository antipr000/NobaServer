import { Mapper } from "../../../core/infra/Mapper";
import { Consumer } from "../domain/Consumer";
import { CryptoWallet } from "../domain/CryptoWallet";
import {
  AggregatedPaymentMethodState,
  AggregatedWalletState,
  DocumentVerificationState,
  documentVerificationStatusToStateMap,
  KycVerificationState,
  kycVerificationStatusToStateMap,
  UserState,
} from "../domain/ExternalStates";
import { PaymentMethod, PaymentMethodType } from "../domain/PaymentMethod";
import { DocumentVerificationStatus, KYCStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";
import { ConsumerDTO, ConsumerSimpleDTO, CryptoWalletsDTO, PaymentMethodsDTO } from "../dto/ConsumerDTO";

export class ConsumerMapper implements Mapper<Consumer> {
  public toDomain(raw: any): Consumer {
    return Consumer.createConsumer(raw);
  }

  private getPaymentMethodStatus(paymentMethods: PaymentMethod[]): AggregatedPaymentMethodState {
    if (paymentMethods.length == 0) return AggregatedPaymentMethodState.NOT_SUBMITTED; // We have no payment methods

    // If all payment methods are approved, payment method status is approved
    const numApproved = paymentMethods.filter(
      paymentMethod => paymentMethod.status && paymentMethod.status === PaymentMethodStatus.APPROVED,
    ).length;

    return numApproved === paymentMethods.length
      ? AggregatedPaymentMethodState.APPROVED
      : AggregatedPaymentMethodState.PENDING;
  }

  private getWalletStatus(wallets: CryptoWallet[]): AggregatedWalletState {
    // At least one wallet is rejected
    if (wallets.filter(wallet => wallet.status === WalletStatus.REJECTED).length > 0)
      return AggregatedWalletState.NOT_SUBMITTED;
    // At least one wallet is flagged or pending
    else if (
      wallets.filter(wallet => wallet.status === WalletStatus.FLAGGED || wallet.status === WalletStatus.PENDING)
        .length > 0
    )
      return AggregatedWalletState.PENDING;
    else if (wallets.length > 0) return AggregatedWalletState.APPROVED;

    // We have no wallets
    return AggregatedWalletState.NOT_SUBMITTED;
  }

  public toCryptoWalletsDTO(cryptoWallet: CryptoWallet): CryptoWalletsDTO {
    return {
      walletName: cryptoWallet.walletName,
      address: cryptoWallet.address,
      chainType: cryptoWallet.chainType,
      isEVMCompatible: cryptoWallet.isEVMCompatible,
      //partnerID: cryptoWallet.partnerID,
    };
  }

  // TODO(Plaid) figure out mapping
  public toPaymentMethodsDTO(paymentMethod: PaymentMethod): PaymentMethodsDTO {
    if (paymentMethod.type === PaymentMethodType.CARD) {
      return {
        type: PaymentMethodType.CARD,
        name: paymentMethod.name,
        imageUri: paymentMethod.imageUri,
        paymentToken: paymentMethod.paymentToken,
        cardData: {
          first6Digits: paymentMethod.cardData.first6Digits,
          last4Digits: paymentMethod.cardData.last4Digits,
          cardType: paymentMethod.cardData.cardType,
        },
      };
    } else if (paymentMethod.type === PaymentMethodType.ACH) {
      return {
        type: PaymentMethodType.ACH,
        name: paymentMethod.name,
        imageUri: paymentMethod.imageUri,
        paymentToken: paymentMethod.paymentToken,
        achData: {
          accountMask: paymentMethod.achData.mask,
          accountType: paymentMethod.achData.accountType,
        },
      };
    } else {
      throw Error(`Unknown payment method type: ${paymentMethod.type}`);
    }
  }

  private getCryptoWalletsDTO(cryptoWallets: CryptoWallet[]): CryptoWalletsDTO[] {
    return cryptoWallets
      .filter(cryptoWallet => cryptoWallet.status === WalletStatus.APPROVED)
      .map(cryptoWallet => this.toCryptoWalletsDTO(cryptoWallet));
  }

  private getPaymentMethodsDTO(paymentMethods: PaymentMethod[]): PaymentMethodsDTO[] {
    return paymentMethods
      .filter(paymentMethod => paymentMethod.status === PaymentMethodStatus.APPROVED)
      .map(paymentMethod => this.toPaymentMethodsDTO(paymentMethod));
  }

  private getUserState(consumer: Consumer): UserState {
    const paymentMethodStatus = this.getPaymentMethodStatus(consumer.props.paymentMethods);
    const walletStatus = this.getWalletStatus(consumer.props.cryptoWallets);

    const identityVerificationStatus =
      consumer.props.verificationData?.kycVerificationStatus ?? KYCStatus.NOT_SUBMITTED;

    const documentVerificationStatus =
      consumer.props.verificationData?.documentVerificationStatus ?? DocumentVerificationStatus.NOT_REQUIRED;

    if (
      identityVerificationStatus === KYCStatus.NOT_SUBMITTED ||
      documentVerificationStatus === DocumentVerificationStatus.REQUIRED ||
      walletStatus === AggregatedWalletState.NOT_SUBMITTED ||
      paymentMethodStatus === AggregatedPaymentMethodState.NOT_SUBMITTED
    ) {
      return UserState.ACTION_REQUIRED;
    } else if (
      identityVerificationStatus === KYCStatus.APPROVED &&
      (documentVerificationStatus === DocumentVerificationStatus.APPROVED ||
        documentVerificationStatus === DocumentVerificationStatus.LIVE_PHOTO_VERIFIED ||
        documentVerificationStatus === DocumentVerificationStatus.NOT_REQUIRED) &&
      walletStatus === AggregatedWalletState.APPROVED &&
      paymentMethodStatus === AggregatedPaymentMethodState.APPROVED
    ) {
      return UserState.APPROVED;
    } else {
      return UserState.PENDING;
    }
  }

  public toDTO(consumer: Consumer): ConsumerDTO {
    const p = consumer.props;
    return {
      _id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.displayEmail ? p.displayEmail : p.email,
      phone: p.phone,
      isSuspectedFraud: p.isSuspectedFraud,
      isLocked: p.isLocked,
      isDisabled: p.isDisabled,
      status: this.getUserState(consumer),
      kycVerificationData: {
        kycVerificationStatus: p.verificationData
          ? kycVerificationStatusToStateMap[p.verificationData.kycVerificationStatus]
          : KycVerificationState.NOT_SUBMITTED,
        updatedTimestamp: p.verificationData ? p.verificationData.kycVerificationTimestamp : 0,
      },
      documentVerificationData: {
        documentVerificationStatus: p.verificationData
          ? documentVerificationStatusToStateMap[p.verificationData.documentVerificationStatus]
          : DocumentVerificationState.NOT_REQUIRED,
        updatedTimestamp: p.verificationData ? p.verificationData.documentVerificationTimestamp : 0,
      },
      dateOfBirth: p.dateOfBirth,
      address: p.address,
      cryptoWallets: this.getCryptoWalletsDTO(p.cryptoWallets),
      paymentMethods: this.getPaymentMethodsDTO(p.paymentMethods),
      paymentMethodStatus: this.getPaymentMethodStatus(consumer.props.paymentMethods),
      walletStatus: this.getWalletStatus(consumer.props.cryptoWallets),
    };
  }

  public toSimpleDTO(consumer: Consumer): ConsumerSimpleDTO {
    const p = consumer.props;
    return {
      _id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.displayEmail ? p.displayEmail : p.email,
      phone: p.phone,
    };
  }
}
