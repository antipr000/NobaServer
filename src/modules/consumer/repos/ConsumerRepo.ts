import { Prisma } from "@prisma/client";
import { Result } from "../../../core/logic/Result";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";

export interface IConsumerRepo {
  getConsumer(consumerID: string): Promise<Consumer>;
  createConsumer(consumer: Consumer | Prisma.ConsumerCreateInput): Promise<Consumer>;
  exists(emailOrPhone: string): Promise<boolean>;
  getConsumerByEmail(email: string): Promise<Result<Consumer>>;
  getConsumerByPhone(phone: string): Promise<Result<Consumer>>;
  updateConsumer(consumerID: string, consumer: Partial<ConsumerProps>): Promise<Consumer>;
  isHandleTaken(handle: string): Promise<boolean>;
  addPaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod>;
  getPaymentMethodForConsumer(id: string, consumerID: string): Promise<PaymentMethod>;
  getAllPaymentMethodsForConsumer(consumerID: string): Promise<PaymentMethod[]>;
  updatePaymentMethod(id: string, paymentMethodProps: Partial<PaymentMethodProps>): Promise<PaymentMethod>;
}
