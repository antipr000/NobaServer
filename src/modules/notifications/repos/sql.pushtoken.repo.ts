import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infraproviders/PrismaService";

@Injectable()
export class SQLPushtokenRepo implements IPushtokenRepo {
  @Inject()
  private readonly prisma: PrismaService;

  constructor() {}

  async getPushTokens(consumerID: string): Promise<string[]> {
    const consumerPushtokens = await this.prisma.pushtokens.findMany({
      where: {
        id: consumerID,
      },
    });
    return consumerPushtokens;
  }

  async addPushToken(consumerID: string, pushToken: string): Promise<void> {
    const consumer = await this.prisma.consumer.findUnique({
      where: {
        id: consumerID,
      },
      select: {
        pushTokens: true,
      },
    });
    if (consumer.pushTokens.includes(pushToken)) {
      return;
    }
    await this.prisma.consumer.update({
      where: {
        id: consumerID,
      },
      data: {
        pushTokens: {
          push: pushToken,
        },
      },
    });
  }
}
