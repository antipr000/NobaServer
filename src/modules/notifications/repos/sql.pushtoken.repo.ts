import { Inject, Injectable, Logger } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../infraproviders/PrismaService";

@Injectable()
export class SQLPushtokenRepo implements IPushtokenRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor() {}

  async getPushToken(consumerID: string, pushTokenID: string): Promise<string> {
    try {
      const consumerPushtoken = await this.prisma.pushtoken.findUnique({
        where: {
          id: consumerID,
          pushtoken: pushTokenID,
        },
      });
      if (!consumerPushtoken) {
        return null;
      }

      return consumerPushtoken.id;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      // throw here
    }
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
