import { Mapper } from "../../../core/infra/Mapper";
import { Consumer } from "../domain/Consumer";
import { CryptoWallet } from "../domain/CryptoWallet";
import { PaymentMethod, PaymentMethodType } from "../domain/PaymentMethod";
import { DocumentVerificationStatus, KYCStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";
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
      walletName: cryptoWallet.walletName,
      address: cryptoWallet.address,
      chainType: cryptoWallet.chainType,
      isEVMCompatible: cryptoWallet.isEVMCompatible,
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
          scheme: paymentMethod.cardData.scheme,
        },
        isDefault: paymentMethod.isDefault,
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
        isDefault: paymentMethod.isDefault,
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

  public toDTO(consumer: Consumer): ConsumerDTO {
    const p = consumer.props;
    const [documentVerificationStatus, documentVerificationErrorReason] =
      this.statesMapper.getDocumentVerificationState(
        p.verificationData ? p.verificationData.documentVerificationStatus : DocumentVerificationStatus.NOT_REQUIRED,
      );
    return {
      _id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.displayEmail ? p.displayEmail : p.email,
      handle: p.handle,
      phone: p.phone,
      status: this.statesMapper.getUserState(consumer),
      kycVerificationData: {
        kycVerificationStatus: this.statesMapper.getKycVerificationState(
          p.verificationData ? p.verificationData.kycVerificationStatus : KYCStatus.NOT_SUBMITTED,
        ),
        updatedTimestamp: p.verificationData ? p.verificationData.kycVerificationTimestamp : 0,
      },
      documentVerificationData: {
        documentVerificationStatus: documentVerificationStatus,
        documentVerificationErrorReason: documentVerificationErrorReason,
        updatedTimestamp: p.verificationData ? p.verificationData.documentVerificationTimestamp : 0,
      },
      dateOfBirth: p.dateOfBirth,
      address: p.address,
      cryptoWallets: this.getCryptoWalletsDTO(p.cryptoWallets),
      paymentMethods: this.getPaymentMethodsDTO(p.paymentMethods),
      paymentMethodStatus: this.statesMapper.getPaymentMethodState(consumer.props.paymentMethods),
      walletStatus: this.statesMapper.getWalletState(consumer.props.cryptoWallets),
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
