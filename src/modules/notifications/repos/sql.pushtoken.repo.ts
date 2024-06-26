import { Inject, Injectable, Logger } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { IPushTokenRepo } from "./pushtoken.repo";
import { AlertService } from "../../../modules/common/alerts/alert.service";

@Injectable()
export class SQLPushTokenRepo implements IPushTokenRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject()
  private readonly alertService: AlertService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  async getAllPushTokensForConsumer(consumerID: string): Promise<string[]> {
    try {
      const consumerPushTokens = await this.prisma.pushToken.findMany({
        where: {
          consumerID: consumerID,
        },
      });
      if (!consumerPushTokens) {
        return [];
      }

      return consumerPushTokens.map(tokenData => tokenData.pushToken);
    } catch (e) {
      this.alertService.raiseError(JSON.stringify(e));
      return [];
    }
  }

  async getPushToken(consumerID: string, pushToken: string): Promise<string> {
    try {
      const consumerPushToken = await this.prisma.pushToken.findFirst({
        where: {
          consumerID: consumerID,
          pushToken: pushToken,
        },
      });
      if (!consumerPushToken) {
        return null;
      }

      return consumerPushToken.id;
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Failed to get push token for consumerID: ${consumerID} and pushToken: ${pushToken}`,
      });
    }
  }

  async addPushToken(consumerID: string, pushToken: string): Promise<string> {
    try {
      const createdPushToken = await this.prisma.pushToken.create({
        data: {
          consumerID: consumerID,
          pushToken: pushToken,
        },
      });
      if (!createdPushToken) {
        return null;
      }

      return createdPushToken.id;
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Failed to add push token for consumerID: ${consumerID} and pushToken: ${pushToken}`,
      });
    }
  }

  async deletePushToken(consumerID: string, pushToken: string): Promise<string> {
    try {
      const deletedPushToken = await this.prisma.pushToken.delete({
        where: {
          consumerID_pushToken: {
            consumerID: consumerID,
            pushToken: pushToken,
          },
        },
      });
      if (!deletedPushToken) {
        return null;
      }

      return deletedPushToken.id;
    } catch (err) {
      this.alertService.raiseError(JSON.stringify(err));
      if (err.code === "P2025") {
        // Record to delete does not exist
        return null;
      }
      throw new RepoException({
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
        message: `Failed to delete push token for consumerID: ${consumerID} and pushToken: ${pushToken}`,
      });
    }
  }
}
