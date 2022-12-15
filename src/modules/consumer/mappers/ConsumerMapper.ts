import { Mapper } from "../../../core/infra/Mapper";
import { Consumer } from "../domain/Consumer";
import { CryptoWallet } from "../domain/CryptoWallet";
import { PaymentMethod } from "../domain/PaymentMethod";
import {
  DocumentVerificationStatus,
  KYCStatus,
  PaymentMethodStatus,
  WalletStatus,
  PaymentMethodType,
} from "@prisma/client";
import { ConsumerDTO, ConsumerSimpleDTO, CryptoWalletsDTO, PaymentMethodsDTO } from "../dto/ConsumerDTO";
import { StatesMapper } from "./StatesMapper";

export class ConsumerMapper implements Mapper<Consumer> {
  private readonly statesMapper: StatesMapper;

  constructor() {
    this.statesMapper = new StatesMapper();
  }

  public toDomain(raw: any): Consumer {
    return Consumer.createConsumer(raw);
  }

  public toCryptoWalletsDTO(cryptoWallet: CryptoWallet): CryptoWalletsDTO {
    return {
      walletName: cryptoWallet.props.name,
      address: cryptoWallet.props.address,
      chainType: cryptoWallet.props.chainType,
      isEVMCompatible: cryptoWallet.props.isEVMCompatible,
    };
  }

  // TODO(Plaid) figure out mapping
  public toPaymentMethodsDTO(paymentMethod: PaymentMethod): PaymentMethodsDTO {
    if (paymentMethod.props.type === PaymentMethodType.CARD) {
      return {
        type: PaymentMethodType.CARD,
        name: paymentMethod.props.name,
        imageUri: paymentMethod.props.imageUri,
        paymentToken: paymentMethod.props.paymentToken,
        cardData: {
          first6Digits: paymentMethod.props.cardData.first6Digits,
          last4Digits: paymentMethod.props.cardData.last4Digits,
          cardType: paymentMethod.props.cardData.cardType,
          scheme: paymentMethod.props.cardData.scheme,
        },
        isDefault: paymentMethod.props.isDefault,
      };
    } else if (paymentMethod.props.type === PaymentMethodType.ACH) {
      return {
        type: PaymentMethodType.ACH,
        name: paymentMethod.props.name,
        imageUri: paymentMethod.props.imageUri,
        paymentToken: paymentMethod.props.paymentToken,
        achData: {
          accountMask: paymentMethod.props.achData.mask,
          accountType: paymentMethod.props.achData.accountType,
        },
        isDefault: paymentMethod.props.isDefault,
      };
    } else {
      throw Error(`Unknown payment method type: ${paymentMethod.props.type}`);
    }
  }

  private getCryptoWalletsDTO(cryptoWallets: CryptoWallet[]): CryptoWalletsDTO[] {
    return cryptoWallets
      .filter(cryptoWallet => cryptoWallet.props.status === WalletStatus.APPROVED)
      .map(cryptoWallet => this.toCryptoWalletsDTO(cryptoWallet));
  }

  private getPaymentMethodsDTO(paymentMethods: PaymentMethod[]): PaymentMethodsDTO[] {
    return paymentMethods
      .filter(paymentMethod => paymentMethod.props.status === PaymentMethodStatus.APPROVED)
      .map(paymentMethod => this.toPaymentMethodsDTO(paymentMethod));
  }

  public toDTO(consumer: Consumer, paymentMethods: PaymentMethod[], cryptoWallets: CryptoWallet[]): ConsumerDTO {
    const p = consumer.props;
    const [documentVerificationStatus, documentVerificationErrorReason] =
      this.statesMapper.getDocumentVerificationState(
        p.verificationData ? p.verificationData.documentVerificationStatus : DocumentVerificationStatus.NOT_REQUIRED,
      );
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.displayEmail ? p.displayEmail : p.email,
      handle: p.handle,
      phone: p.phone,
      status: this.statesMapper.getUserState(consumer, paymentMethods, cryptoWallets),
      kycVerificationData: {
        kycVerificationStatus: this.statesMapper.getKycVerificationState(
          p.verificationData ? p.verificationData.kycCheckStatus : KYCStatus.NOT_SUBMITTED,
        ),
        updatedTimestamp:
          p.verificationData && p.verificationData.kycVerificationTimestamp
            ? p.verificationData.kycVerificationTimestamp.getTime()
            : 0,
      },
      documentVerificationData: {
        documentVerificationStatus: documentVerificationStatus,
        documentVerificationErrorReason: documentVerificationErrorReason,
        updatedTimestamp:
          p.verificationData && p.verificationData.documentVerificationTimestamp
            ? p.verificationData.documentVerificationTimestamp.getTime()
            : 0,
      },
      dateOfBirth: p.dateOfBirth,
      address: {
        streetLine1: p.address.streetLine1,
        streetLine2: p.address.streetLine2,
        city: p.address.city,
        regionCode: p.address.regionCode,
        countryCode: p.address.countryCode,
        postalCode: p.address.postalCode,
      },
      cryptoWallets: this.getCryptoWalletsDTO(cryptoWallets),
      paymentMethods: this.getPaymentMethodsDTO(paymentMethods),
      paymentMethodStatus: this.statesMapper.getPaymentMethodState(paymentMethods),
      walletStatus: this.statesMapper.getWalletState(cryptoWallets),
    };
  }

  public toSimpleDTO(consumer: Consumer): ConsumerSimpleDTO {
    const p = consumer.props;
    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.displayEmail ? p.displayEmail : p.email,
      phone: p.phone,
    };
  }
}
