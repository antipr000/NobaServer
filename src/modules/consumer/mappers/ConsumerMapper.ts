import { Consumer } from "../domain/Consumer";
import { ConsumerDTO, CryptoWalletsDTO, PaymentMethodsDTO } from "../dto/ConsumerDTO";
import { Mapper } from "../../../core/infra/Mapper";
import { CryptoWallets } from "../domain/CryptoWallets";
import { PaymentMethods } from "../domain/PaymentMethods";
import { ConsumerVerificationStatus, DocumentVerificationStatus } from "../domain/VerificationStatus";

export class ConsumerMapper implements Mapper<Consumer> {
  public toDomain(raw: any): Consumer {
    return Consumer.createConsumer(raw);
  }

  public toCryptoWalletsDTO(cryptoWallets: CryptoWallets): CryptoWalletsDTO {
    return {
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
      kycVerificationData: {
        kycVerificationStatus: p.verificationData
          ? p.verificationData.kycVerificationStatus
          : ConsumerVerificationStatus.PENDING_NEW,
        updatedAt: p.verificationData ? p.verificationData.idVerificationTimestamp : 0,
      },
      documentVerificationData: {
        documentVerificationStatus: p.verificationData
          ? p.verificationData.documentVerificationStatus
          : DocumentVerificationStatus.NOT_REQUIRED,
        updatedAt: p.verificationData ? p.verificationData.documentVerificationTimestamp : 0,
      },
      dateOfBirth: p.dateOfBirth,
      address: p.address,
      cryptoWallets: p.cryptoWallets.map(cryptoWallet => this.toCryptoWalletsDTO(cryptoWallet)),
      paymentMethods: p.paymentMethods.map(paymentMethod => this.toPaymentMethodsDTO(paymentMethod)),
    };
  }
}
