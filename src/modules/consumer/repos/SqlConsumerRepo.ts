import { Inject, Injectable } from "@nestjs/common";
import { Result } from "../../../core/logic/Result";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { IConsumerRepo } from "./ConsumerRepo";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { PaymentMethodStatus, Prisma } from "@prisma/client";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";
import { ConsumerRepoMapper } from "../mappers/ConsumerRepoMapper";

@Injectable()
export class SQLConsumerRepo implements IConsumerRepo {
  @Inject()
  private readonly prisma: PrismaService;

  private readonly mapper: ConsumerRepoMapper;

  constructor() {
    this.mapper = new ConsumerRepoMapper();
  }

  async getConsumer(consumerID: string): Promise<Consumer> {
    const consumerProps = await this.prisma.consumer.findUnique({ where: { id: consumerID } });
    if (!consumerProps) return null;
    return Consumer.createConsumer(consumerProps);
  }

  async createConsumer(consumer: Prisma.ConsumerCreateInput): Promise<Consumer> {
    const consumerProps = await this.prisma.consumer.create({ data: consumer });
    return Consumer.createConsumer(consumerProps);
  }

  async exists(emailOrPhone: string): Promise<boolean> {
    const consumerProps = await this.prisma.consumer.findUnique({ where: { email: emailOrPhone } });
    if (consumerProps) return true;
    return false;
  }

  async getConsumerByEmail(email: string): Promise<Result<Consumer>> {
    const consumerProps = await this.prisma.consumer.findUnique({ where: { email: email } });
    if (consumerProps) {
      return Result.ok(Consumer.createConsumer(consumerProps));
    } else {
      return Result.fail("Couldn't find consumer with given email in the db");
    }
  }

  async getConsumerByPhone(phone: string): Promise<Result<Consumer>> {
    const consumerProps = await this.prisma.consumer.findUnique({ where: { phone: phone } });
    if (consumerProps) {
      return Result.ok(Consumer.createConsumer(consumerProps));
    } else {
      return Result.fail("Couldn't find consumer with given phone number in the db");
    }
  }

  async updateConsumer(consumerID: string, consumer: Partial<ConsumerProps>): Promise<Consumer> {
    const updateConsumerInput = this.mapper.toUpdateConsumerInput(consumer);
    const consumerProps = await this.prisma.consumer.update({ where: { id: consumerID }, data: updateConsumerInput });
    return Consumer.createConsumer(consumerProps);
  }

  async isHandleTaken(handle: string): Promise<boolean> {
    const consumerProps = await this.prisma.consumer.findUnique({ where: { handle: handle } });
    if (!consumerProps) return false;
    return true;
  }

  async addPaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    const paymentMethodInput = this.mapper.toCreatePaymentMethodInput(paymentMethod);
    const paymentMethodProps = await this.prisma.paymentMethod.create({ data: paymentMethodInput });
    return PaymentMethod.createPaymentMethod(paymentMethodProps);
  }

  async getPaymentMethodForConsumer(id: string, consumerID: string): Promise<PaymentMethod> {
    const paymentMethodProps = await this.prisma.paymentMethod.findFirst({
      where: { id: id, consumerID: consumerID, status: { not: PaymentMethodStatus.DELETED } },
    });
    if (!paymentMethodProps) return null;
    return PaymentMethod.createPaymentMethod(paymentMethodProps);
  }

  async getAllPaymentMethodsForConsumer(consumerID: string): Promise<PaymentMethod[]> {
    const allPaymentMethods = await this.prisma.paymentMethod.findMany({
      where: { consumerID: consumerID, status: { not: PaymentMethodStatus.DELETED } },
    });
    if (!allPaymentMethods) return [];
    return allPaymentMethods.map(paymentMethod => PaymentMethod.createPaymentMethod(paymentMethod));
  }

  async updatePaymentMethod(id: string, paymentMethodProps: Partial<PaymentMethodProps>): Promise<PaymentMethod> {
    const updatePaymentMethodInput = this.mapper.toUpdatePaymentMethodInput(paymentMethodProps);
    const updatedProps = await this.prisma.paymentMethod.update({ where: { id: id }, data: updatePaymentMethodInput });
    return PaymentMethod.createPaymentMethod(updatedProps);
  }
}
