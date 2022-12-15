import { Prisma } from "@prisma/client";
import { ConsumerProps } from "../domain/Consumer";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";

export class ConsumerRepoMapper {
  toUpdateConsumerInput(consumerUpdateProps: Partial<ConsumerProps>): Prisma.ConsumerUpdateInput {
    return {
      ...(consumerUpdateProps.firstName && { firstName: consumerUpdateProps.firstName }),
      ...(consumerUpdateProps.lastName && { lastName: consumerUpdateProps.lastName }),
      ...(consumerUpdateProps.handle && { handle: consumerUpdateProps.handle }),
      ...(consumerUpdateProps.dateOfBirth && { dateOfBirth: consumerUpdateProps.dateOfBirth }),
      ...(consumerUpdateProps.isDisabled && { isDisabled: consumerUpdateProps.isDisabled }),
      ...(consumerUpdateProps.isLocked && { isLocked: consumerUpdateProps.isLocked }),
      ...(consumerUpdateProps.phone && { phone: consumerUpdateProps.phone }),
      ...(consumerUpdateProps.email && { phone: consumerUpdateProps.email }),
      ...(consumerUpdateProps.displayEmail && { phone: consumerUpdateProps.displayEmail }),
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
              ...consumerUpdateProps.address,
            },
            create: {
              ...consumerUpdateProps.address,
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
}
