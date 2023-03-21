import { Prisma } from "@prisma/client";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { CryptoWallet, CryptoWalletProps } from "../domain/CryptoWallet";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";
import { Address } from "../domain/Address";
import { KYC } from "../domain/KYC";
import { Identification, IdentificationProps } from "../domain/Identification";

export class ConsumerRepoMapper {
  toCreateConsumerInput(consumer: Consumer): Prisma.ConsumerCreateInput {
    return {
      id: consumer.props.id,
      ...(consumer.props.firstName && { firstName: consumer.props.firstName }),
      ...(consumer.props.lastName && { lastName: consumer.props.lastName }),
      ...(consumer.props.handle && { handle: consumer.props.handle }),
      ...(consumer.props.locale && { locale: consumer.props.locale }),
      ...(consumer.props.gender && { gender: consumer.props.gender }),
      ...(consumer.props.referralCode && { referralCode: consumer.props.referralCode }),
      ...(consumer.props.dateOfBirth && { dateOfBirth: consumer.props.dateOfBirth }),
      ...(consumer.props.isDisabled && { isDisabled: consumer.props.isDisabled }),
      ...(consumer.props.isLocked && { isLocked: consumer.props.isLocked }),
      ...(consumer.props.phone && { phone: consumer.props.phone }),
      ...(consumer.props.email && { email: consumer.props.email }),
      ...(consumer.props.displayEmail && { displayEmail: consumer.props.displayEmail }),
      ...(consumer.props.socialSecurityNumber && {
        socialSecurityNumber: consumer.props.socialSecurityNumber,
      }),
      ...(consumer.props.referredByID && { referredByID: consumer.props.referredByID }),
      ...(consumer.props.address && {
        address: {
          create: {
            ...consumer.props.address,
          },
        },
      }),
      ...(consumer.props.verificationData && {
        verificationData: {
          create: {
            ...consumer.props.verificationData,
          },
        },
      }),
    };
  }

  toUpdateConsumerInput(consumerUpdateProps: Partial<ConsumerProps>): Prisma.ConsumerUpdateInput {
    return {
      ...(consumerUpdateProps.firstName && { firstName: consumerUpdateProps.firstName }),
      ...(consumerUpdateProps.lastName && { lastName: consumerUpdateProps.lastName }),
      ...(consumerUpdateProps.handle && { handle: consumerUpdateProps.handle }),
      ...(consumerUpdateProps.gender && { gender: consumerUpdateProps.gender }),
      ...(consumerUpdateProps.locale && { locale: consumerUpdateProps.locale }),
      ...(consumerUpdateProps.referralCode && { referralCode: consumerUpdateProps.referralCode }),
      ...(consumerUpdateProps.dateOfBirth && { dateOfBirth: consumerUpdateProps.dateOfBirth }),
      ...(consumerUpdateProps.isDisabled && { isDisabled: consumerUpdateProps.isDisabled }),
      ...(consumerUpdateProps.isLocked && { isLocked: consumerUpdateProps.isLocked }),
      ...(consumerUpdateProps.phone && { phone: consumerUpdateProps.phone }),
      ...(consumerUpdateProps.email && { email: consumerUpdateProps.email }),
      ...(consumerUpdateProps.displayEmail && { displayEmail: consumerUpdateProps.displayEmail }),
      ...(consumerUpdateProps.socialSecurityNumber && {
        socialSecurityNumber: consumerUpdateProps.socialSecurityNumber,
      }),
      ...(consumerUpdateProps.referredByID && { referredByID: consumerUpdateProps.referredByID }),
      ...(consumerUpdateProps.address &&
        Object.keys(consumerUpdateProps.address).length > 0 && {
          address: {
            upsert: {
              create: this.toAddressInput(consumerUpdateProps.address),
              update: this.toAddressInput(consumerUpdateProps.address),
            },
          },
        }),
      ...(consumerUpdateProps.verificationData &&
        Object.keys(consumerUpdateProps.verificationData).length > 0 && {
          verificationData: {
            upsert: {
              update: this.toVerificationDataInput(consumerUpdateProps.verificationData),
              create: this.toVerificationDataInput(consumerUpdateProps.verificationData),
            },
          },
        }),
    };
  }

  toCreatePaymentMethodInput(paymentMethod: PaymentMethod): Prisma.PaymentMethodCreateInput {
    return {
      id: paymentMethod.props.id,
      type: paymentMethod.props.type,
      status: paymentMethod.props.status,
      paymentProvider: paymentMethod.props.paymentProvider,
      paymentToken: paymentMethod.props.paymentToken,
      consumer: {
        connect: {
          id: paymentMethod.props.consumerID,
        },
      },
      ...(paymentMethod.props.cardData && {
        cardData: {
          create: {
            ...paymentMethod.props.cardData,
          },
        },
      }),
      ...(paymentMethod.props.achData && {
        achData: {
          create: {
            ...paymentMethod.props.achData,
          },
        },
      }),
    };
  }

  toUpdatePaymentMethodInput(paymentMethodProps: Partial<PaymentMethodProps>): Prisma.PaymentMethodUpdateInput {
    return {
      ...(paymentMethodProps.name && { name: paymentMethodProps.name }),
      ...(paymentMethodProps.status && { status: paymentMethodProps.status }),
      ...(paymentMethodProps.isDefault && { isDefault: paymentMethodProps.isDefault }),
      ...(paymentMethodProps.imageUri && { imageUri: paymentMethodProps.imageUri }),
    };
  }

  toCreateWalletInput(wallet: CryptoWallet): Prisma.CryptoWalletCreateInput {
    return {
      id: wallet.props.id,
      name: wallet.props.name,
      chainType: wallet.props.chainType,
      status: wallet.props.status,
      address: wallet.props.address,
      consumer: {
        connect: {
          id: wallet.props.consumerID,
        },
      },
      isEVMCompatible: wallet.props.isEVMCompatible,
      riskScore: wallet.props.riskScore,
    };
  }

  toUpdateWalletInput(wallet: Partial<CryptoWalletProps>): Prisma.CryptoWalletUpdateInput {
    return {
      ...(wallet.name && { name: wallet.name }),
      ...(wallet.status && { status: wallet.status }),
      ...(wallet.riskScore && { riskScore: wallet.riskScore }),
    };
  }

  toCreateIdentificationInput(identification: Identification): Prisma.IdentificationCreateInput {
    return {
      id: identification.props.id,
      type: identification.props.type,
      value: identification.props.value,
      consumer: {
        connect: {
          id: identification.props.consumerID,
        },
      },
    };
  }

  toUpdateIdentificationInput(identification: Partial<IdentificationProps>): Prisma.IdentificationUpdateInput {
    return {
      ...(identification.type && { type: identification.type }),
      ...(identification.value && { value: identification.value }),
    };
  }

  toAddressInput(address: Address): Prisma.AddressCreateWithoutConsumerInput {
    return {
      streetLine1: address.streetLine1,
      ...(address.streetLine2 && { streetLine2: address.streetLine2 }),
      countryCode: address.countryCode,
      city: address.city,
      regionCode: address.regionCode,
      postalCode: address.postalCode,
    };
  }

  toVerificationDataInput(verificationData: KYC): Prisma.KYCCreateWithoutConsumerInput {
    return {
      ...(verificationData.documentCheckReference && {
        documentCheckReference: verificationData.documentCheckReference,
      }),
      ...(verificationData.documentVerificationStatus && {
        documentVerificationStatus: verificationData.documentVerificationStatus,
      }),
      ...(verificationData.documentVerificationTimestamp && {
        documentVerificationTimestamp: verificationData.documentVerificationTimestamp,
      }),
      ...(verificationData.isSuspectedFraud && {
        isSuspectedFraud: verificationData.isSuspectedFraud,
      }),
      ...(verificationData.kycCheckReference && {
        kycCheckReference: verificationData.kycCheckReference,
      }),
      ...(verificationData.kycCheckStatus && {
        kycCheckStatus: verificationData.kycCheckStatus,
      }),
      ...(verificationData.kycVerificationTimestamp && {
        kycVerificationTimestamp: verificationData.kycVerificationTimestamp,
      }),
      ...(verificationData.provider && {
        provider: verificationData.provider,
      }),
      ...(verificationData.riskLevel && {
        riskLevel: verificationData.riskLevel,
      }),
      ...(verificationData.sanctionLevel && {
        sanctionLevel: verificationData.sanctionLevel,
      }),
      ...(verificationData.riskRating && {
        riskRating: verificationData.riskRating,
      }),
    };
  }
}
