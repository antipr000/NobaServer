import { Inject, Injectable, Logger } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { IPushtokenRepo } from "./pushtoken.repo";

@Injectable()
export class SQLPushtokenRepo implements IPushtokenRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  constructor() {}

  async getPushToken(consumerID: string, pushtoken: string): Promise<string> {
    try {
      const consumerPushtoken = await this.prisma.pushtoken.findFirst({
        where: {
          consumerID: consumerID,
          pushtoken: pushtoken,
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

  async addPushToken(consumerID: string, pushtoken: string): Promise<string> {
    try {
      const createdPushtoken = await this.prisma.pushtoken.create({
        data: {
          consumerID: consumerID,
          pushtoken: pushtoken,
        },
      });
      if (!createdPushtoken) {
        return null;
      }

      return createdPushtoken.id;
    } catch (err) {
      this.logger.error(JSON.stringify(err));
      // throw here
    }
  }
}
