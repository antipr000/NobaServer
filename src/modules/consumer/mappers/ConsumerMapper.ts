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
      kycVerificationStatus: p.verificationData
        ? p.verificationData.kycVerificationStatus
        : ConsumerVerificationStatus.PENDING_NEW,
      documentVerificationStatus: p.verificationData
        ? p.verificationData.documentVerificationStatus
        : DocumentVerificationStatus.NOT_REQUIRED,
      dateOfBirth: p.dateOfBirth,
      address: p.address,
      cryptoWallets: p.cryptoWallets.map(cryptoWallet => this.toCryptoWalletsDTO(cryptoWallet)),
      paymentMethods: p.paymentMethods.map(paymentMethod => this.toPaymentMethodsDTO(paymentMethod)),
    };
  }
}
