import { Prisma } from "@prisma/client";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { CryptoWallet, CryptoWalletProps } from "../domain/CryptoWallet";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";

export class ConsumerRepoMapper {
  toCreateConsumerInput(consumer: Consumer): Prisma.ConsumerCreateInput {
    return {
      id: consumer.props.id,
      email: consumer.props.email,
      displayEmail: consumer.props.displayEmail,
      phone: consumer.props.phone,
      handle: consumer.props.handle,
    };
  }

  toUpdateConsumerInput(consumerUpdateProps: Partial<ConsumerProps>): Prisma.ConsumerUpdateInput {
    return {
      ...(consumerUpdateProps.firstName && { firstName: consumerUpdateProps.firstName }),
      ...(consumerUpdateProps.lastName && { lastName: consumerUpdateProps.lastName }),
      ...(consumerUpdateProps.handle && { handle: consumerUpdateProps.handle }),
      ...(consumerUpdateProps.dateOfBirth && { dateOfBirth: consumerUpdateProps.dateOfBirth }),
      ...(consumerUpdateProps.isDisabled && { isDisabled: consumerUpdateProps.isDisabled }),
      ...(consumerUpdateProps.isLocked && { isLocked: consumerUpdateProps.isLocked }),
      ...(consumerUpdateProps.phone && { phone: consumerUpdateProps.phone }),
      ...(consumerUpdateProps.email && { email: consumerUpdateProps.email }),
      ...(consumerUpdateProps.displayEmail && { displayEmail: consumerUpdateProps.displayEmail }),
      ...(consumerUpdateProps.socialSecurityNumber && {
        socialSecurityNumber: consumerUpdateProps.socialSecurityNumber,
      }),
      ...(consumerUpdateProps.address && {
        address: { create: { ...consumerUpdateProps.address } },
      }),
      ...(consumerUpdateProps.verificationData && {
        verificationData: {
          upsert: {
            update: {
              ...consumerUpdateProps.verificationData,
            },
            create: {
              ...consumerUpdateProps.verificationData,
            },
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
}
