import { Consumer } from "../domain/Consumer";
import { ConsumerDTO, CryptoWalletsDTO, PaymentMethodsDTO } from "../dto/ConsumerDTO";
import { Mapper } from "../../../core/infra/Mapper";
import { CryptoWallet } from "../domain/CryptoWallet";
import { PaymentMethod } from "../domain/PaymentMethod";
import { KYCStatus, DocumentVerificationStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";

export class ConsumerMapper implements Mapper<Consumer> {
  public toDomain(raw: any): Consumer {
    return Consumer.createConsumer(raw);
  }

  private getPaymentMethodStatus(paymentMethods: PaymentMethod[]): PaymentMethodStatus {
    if (paymentMethods.length == 0) return undefined; // We have no payment methods

    // If all payment methods are approved, payment method status is approved
    const numApproved = paymentMethods.filter(
      paymentMethod => paymentMethod.status && paymentMethod.status === PaymentMethodStatus.APPROVED,
    ).length;

    return numApproved === paymentMethods.length ? PaymentMethodStatus.APPROVED : PaymentMethodStatus.REJECTED;
  }

  private getWalletStatus(wallets: CryptoWallet[]): WalletStatus {
    // At least one wallet is rejected
    if (wallets.filter(wallet => wallet.status === WalletStatus.REJECTED).length > 0) return WalletStatus.REJECTED;
    // At least one wallet is flagged
    else if (wallets.filter(wallet => wallet.status === WalletStatus.FLAGGED).length > 0) return WalletStatus.FLAGGED;
    // We have at least one wallet but none are rejected or flagged
    else if (wallets.length > 0) WalletStatus.APPROVED;

    // We have no wallets
    return undefined;
  }

  public toCryptoWalletsDTO(cryptoWallets: CryptoWallet): CryptoWalletsDTO {
    return {
      walletName: cryptoWallets.walletName,
      address: cryptoWallets.address,
      chainType: cryptoWallets.chainType,
      isEVMCompatible: cryptoWallets.isEVMCompatible,
      status: cryptoWallets.status,
    };
  }

  public toPaymentMethodsDTO(paymentMethod: PaymentMethod): PaymentMethodsDTO {
    return {
      cardName: paymentMethod.cardName,
      cardType: paymentMethod.cardType,
      imageUri: paymentMethod.imageUri,
      paymentToken: paymentMethod.paymentToken,
      first6Digits: paymentMethod.first6Digits,
      last4Digits: paymentMethod.last4Digits,
      status: paymentMethod.status,
    };
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
      kycVerificationData: {
        kycVerificationStatus: p.verificationData ? p.verificationData.kycVerificationStatus : KYCStatus.NOT_SUBMITTED,
        updatedTimestamp: p.verificationData ? p.verificationData.kycVerificationTimestamp : 0,
      },
      documentVerificationData: {
        documentVerificationStatus: p.verificationData
          ? p.verificationData.documentVerificationStatus
          : DocumentVerificationStatus.NOT_REQUIRED,
        updatedTimestamp: p.verificationData ? p.verificationData.documentVerificationTimestamp : 0,
      },
      dateOfBirth: p.dateOfBirth,
      address: p.address,
      cryptoWallets: p.cryptoWallets.map(cryptoWallet => this.toCryptoWalletsDTO(cryptoWallet)),
      paymentMethods: p.paymentMethods.map(paymentMethod => this.toPaymentMethodsDTO(paymentMethod)),
      paymentMethodStatus: this.getPaymentMethodStatus(consumer.props.paymentMethods),
      walletStatus: this.getWalletStatus(consumer.props.cryptoWallets),
    };
  }
}
