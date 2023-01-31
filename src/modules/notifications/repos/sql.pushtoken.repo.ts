import { Inject, Injectable, Logger } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { IPushTokenRepo } from "./pushtoken.repo";

@Injectable()
export class SQLPushTokenRepo implements IPushTokenRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor() {}

  async getPushToken(consumerID: string, pushToken: string): Promise<string> {
    try {
      const consumerPushToken = await this.prisma.pushtoken.findFirst({
        where: {
          consumerID: consumerID,
          pushtoken: pushToken,
        },
      });
      if (!consumerPushToken) {
        return null;
      }

      return consumerPushToken.id;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      // throw here
    }
  }

  async addPushToken(consumerID: string, pushToken: string): Promise<string> {
    try {
      const createdPushToken = await this.prisma.pushtoken.create({
        data: {
          consumerID: consumerID,
          pushtoken: pushToken,
        },
      });
      if (!createdPushToken) {
        return null;
      }

      return createdPushToken.id;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      // throw here
    }
  }
}
