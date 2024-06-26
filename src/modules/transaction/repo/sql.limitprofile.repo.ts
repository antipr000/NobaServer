import { Inject, Injectable } from "@nestjs/common";
import { LimitProfile } from "../domain/LimitProfile";
import { ILimitProfileRepo } from "./limitprofile.repo";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { LimitsRepoMapper } from "../mapper/limits.repo.mapper";

@Injectable()
export class SQLLimitProfileRepo implements ILimitProfileRepo {
  @Inject()
  private readonly prismaService: PrismaService;

  private readonly repoMapper: LimitsRepoMapper;
  constructor() {
    this.repoMapper = new LimitsRepoMapper();
  }

  async getProfile(id: string): Promise<LimitProfile> {
    const limitProfileProps = await this.prismaService.limitProfile.findUnique({ where: { id: id } });
    if (limitProfileProps == null) return null;
    return LimitProfile.createLimitProfile(limitProfileProps);
  }

  async addProfile(limitProfile: LimitProfile): Promise<LimitProfile> {
    const limitProfileProps = await this.prismaService.limitProfile.create({
      data: this.repoMapper.toCreateLimitProfileInput(limitProfile),
    });
    return LimitProfile.createLimitProfile(limitProfileProps);
  }
}
