import { Inject, Injectable, Logger } from "@nestjs/common";
import { Result } from "../../../core/logic/Result";
import {
  Circle,
  CircleCreateRequest,
  CircleUpdateRequest,
  convertToDomainCircle,
  validateCircle,
  validateCircleCreateRequest,
  validateCircleUpdateRequest,
} from "../domain/Circle";
import { ICircleRepo } from "./circle.repo";
import { Prisma, Circle as PrismaCircleModel } from "@prisma/client";
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

  async addConsumerCircleWalletID(request: CircleCreateRequest): Promise<Circle> {
    validateCircleCreateRequest(request);

    let savedCircle: Circle;
    try {
      const circleInput: Prisma.CircleCreateInput = {
        walletID: request.walletID,
        consumer: {
          connect: {
            id: request.consumerID,
          },
        },
      };

      const returnedCircle: PrismaCircleModel = await this.prisma.circle.create({
        data: circleInput,
      });

      savedCircle = convertToDomainCircle(returnedCircle);
    } catch (e) {
      this.alertService.raiseError(`Failed to create circle: ${e}`);
      throw new RepoException({
        message: "Failed to create circle",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }

    try {
      validateCircle(savedCircle);
      return savedCircle;
    } catch (e) {
      this.alertService.raiseError(`Failed to validate circle data: ${e}`);
      throw new RepoException({
        message: "Failed to validate circle data",
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
      });
    }
  }

  async getCircleWalletID(consumerID: string): Promise<Result<string>> {
    const returnedCircle: PrismaCircleModel = await this.prisma.circle.findUnique({
      where: { consumerID: consumerID },
    });

    if (returnedCircle) {
      return Result.ok(returnedCircle.walletID);
    } else {
      return Result.fail("Couldn't find circle wallet for given consumer in the db");
    }
  }

  async updateCurrentBalance(walletID: string, request: CircleUpdateRequest): Promise<Circle> {
    validateCircleUpdateRequest(request);

    try {
      const updateProps: Prisma.CircleUpdateInput = {
        currentBalance: request.currentBalance,
      };
      const returnedCircle: PrismaCircleModel = await this.prisma.circle.update({
        where: { walletID: walletID },
        data: updateProps,
      });

      return convertToDomainCircle(returnedCircle);
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
      const returnedCircle: PrismaCircleModel = await this.prisma.circle.findFirst({
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

      return returnedCircle.currentBalance;
    } catch (e) {
      this.alertService.raiseError(
        `Failed to fetch circle balance for consumerOrWallerID: ${consumerOrWalletID}. Reason: ${JSON.stringify(e)}`,
      );
      return null;
    }
  }
}
