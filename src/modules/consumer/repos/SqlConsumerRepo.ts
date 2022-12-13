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

  async updateConsumer(consumerID: string, consumer: Prisma.ConsumerUpdateInput): Promise<Consumer> {
    const consumerProps = await this.prisma.consumer.update({ where: { id: consumerID }, data: consumer });
    return Consumer.createConsumer(consumerProps);
  }

  async isHandleTaken(handle: string): Promise<boolean> {
    const consumerProps = await this.prisma.consumer.findUnique({ where: { handle: handle } });
    if (!consumerProps) return false;
    return true;
  }

  updateConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
