import { Consumer } from "../domain/Consumer";
import { ConsumerDTO, CryptoWalletsDTO, PaymentMethodsDTO } from "../dto/ConsumerDTO";
import { Mapper } from "../../../core/infra/Mapper";
import { CryptoWallets } from "../domain/CryptoWallets";
import { PaymentMethods } from "../domain/PaymentMethods";
import { KYCStatus, DocumentVerificationStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";

export class ConsumerMapper implements Mapper<Consumer> {
  public toDomain(raw: any): Consumer {
    return Consumer.createConsumer(raw);
  }

  private getPaymentMethodStatus(paymentMethods: PaymentMethods[]): PaymentMethodStatus {
    const numApproved = paymentMethods.filter(
      paymentMethod => paymentMethod.status && paymentMethod.status === PaymentMethodStatus.APPROVED,
    ).length;

    return numApproved === paymentMethods.length ? PaymentMethodStatus.APPROVED : PaymentMethodStatus.REJECTED;
  }

  private getWalletStatus(wallets: CryptoWallets[]): WalletStatus {
    if (wallets.filter(wallet => wallet.status === WalletStatus.REJECTED).length > 0) return WalletStatus.REJECTED;
    else if (wallets.filter(wallet => wallet.status === WalletStatus.FLAGGED).length > 0) return WalletStatus.FLAGGED;
    return WalletStatus.APPROVED;
  }

  public toCryptoWalletsDTO(cryptoWallets: CryptoWallets): CryptoWalletsDTO {
    return {
      walletName: cryptoWallets.walletName,
      address: cryptoWallets.address,
      chainType: cryptoWallets.chainType,
      isEVMCompatible: cryptoWallets.isEVMCompatible,
      status: cryptoWallets.status,
    };
  }

  public toPaymentMethodsDTO(paymentMethod: PaymentMethods): PaymentMethodsDTO {
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
      email: p.email,
      phone: p.phone,
      isSuspectedFraud: p.isSuspectedFraud,
      isLocked: p.isLocked,
      isDeleted: p.isDeleted,
      kycVerificationData: {
        kycVerificationStatus: p.verificationData ? p.verificationData.kycVerificationStatus : KYCStatus.NOT_SUBMITTED,
        updatedTimestamp: p.verificationData ? p.verificationData.idVerificationTimestamp : 0,
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
