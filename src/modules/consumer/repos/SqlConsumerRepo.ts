import { Inject, Injectable } from "@nestjs/common";
import { Result } from "../../../core/logic/Result";
import { Consumer } from "../domain/Consumer";
import { IConsumerRepo } from "./ConsumerRepo";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Prisma } from "@prisma/client";

@Injectable()
export class SqlConsumerRepo implements IConsumerRepo {
  @Inject()
  private readonly prisma: PrismaService;

  async getConsumer(consumerID: string): Promise<Consumer> {
    const consumerProps = await this.prisma.consumer.findUnique({ where: { id: consumerID } });
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
      return Result.fail("Couldn't find consumer in the db");
    }
  }
  getConsumerByPhone(phone: string): Promise<Result<Consumer>> {
    throw new Error("Method not implemented.");
  }
  updateConsumer(consumer: Consumer): Promise<Consumer> {
    throw new Error("Method not implemented.");
  }
  isHandleTaken(handle: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  updateConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
