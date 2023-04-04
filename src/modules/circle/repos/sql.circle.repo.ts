import { Inject, Injectable, Logger } from "@nestjs/common";
import { Result } from "../../../core/logic/Result";
import { Circle } from "../../psp/domain/Circle";
import { ICircleRepo } from "./circle.repo";
import { Prisma } from "@prisma/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../infraproviders/PrismaService";

@Injectable()
export class SQLCircleRepo implements ICircleRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  async addConsumerCircleWalletID(consumerID: string, circleWalletID: string): Promise<Circle> {
    const circle: Circle = Circle.createCircle({ consumerID: consumerID, walletID: circleWalletID });
    const circlePrisma: Prisma.CircleUncheckedCreateInput = { ...circle.props };
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
}
