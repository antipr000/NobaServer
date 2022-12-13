import { Inject, Injectable } from "@nestjs/common";
import { Result } from "../../../core/logic/Result";
import { Circle } from "../domain/Circle";
import { ICircleRepo } from "./CircleRepo";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Prisma } from "@prisma/client";

@Injectable()
export class SQLCircleRepo implements ICircleRepo {
  @Inject()
  private readonly prisma: PrismaService;

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
