import { Inject, Injectable, Logger } from "@nestjs/common";
import { Result } from "../../../core/logic/Result";
import { Circle } from "../domain/Circle";
import { ICircleRepo } from "./circle.repo";
import { Prisma } from "@prisma/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";
import { AlertService } from "../../../modules/common/alerts/alert.service";

@Injectable()
export class SQLCircleRepo implements ICircleRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly alertService: AlertService;

  async addConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<Circle> {
    const circle: Circle = Circle.createCircle({ consumerID: consumerID, walletID: circleWalletID });
    const circlePrisma: Prisma.CircleCreateInput = {
      id: circle.props.id,
      walletID: circle.props.walletID,
      consumer: {
        connect: {
          id: circle.props.consumerID,
        },
      },
    };
    const circleProps = await this.prisma.circle.create({ data: circlePrisma });
    return Circle.createCircle(circleProps);
  }

  async getCircleWalletID(consumerID: string): Promise<Result<string>> {
    const circleProps = await this.prisma.circle.findUnique({ where: { consumerID: consumerID } });

    if (circleProps) {
      return Result.ok(circleProps.walletID);
    } else {
      return Result.fail("Couldn't find circle wallet for given consumer in the db");
    }
  }

  async updateCurrentBalance(walletID: string, balance: number): Promise<Circle> {
    const updateProps: Prisma.CircleUpdateInput = {
      currentBalance: balance,
    };

    try {
      const circleProps = await this.prisma.circle.update({
        where: { walletID: walletID },
        data: updateProps,
      });

      return Circle.createCircle(circleProps);
    } catch (e) {
      this.alertService.raiseError(
        `Failed to update circle balance for wallet id ${walletID}. Reason: ${JSON.stringify(e)}`,
      );
      throw new RepoException({
        message: "Failed to update circle balance",
        errorCode: RepoErrorCode.NOT_FOUND,
      });
    }
  }

  async getCircleBalance(consumerOrWalletID: string): Promise<number> {
    try {
      const circleProps = await this.prisma.circle.findFirst({
        where: {
          OR: [
            {
              consumerID: consumerOrWalletID,
            },
            {
              walletID: consumerOrWalletID,
            },
          ],
        },
      });

      return circleProps.currentBalance;
    } catch (e) {
      this.alertService.raiseError(
        `Failed to fetch circle balance for consumerOrWallerID: ${consumerOrWalletID}. Reason: ${JSON.stringify(e)}`,
      );
      return null;
    }
  }
}
