import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { ILimitConfigurationRepo } from "./LimitConfigurationRepo";
import { LimitConfiguration } from "../domain/LimitConfiguration";
import { LimitsRepoMapper } from "../mapper/LimitsRepoMapper";

@Injectable()
export class SQLLimitConfigurationRepo implements ILimitConfigurationRepo {
  @Inject()
  private readonly prismaService: PrismaService;

  private readonly repoMapper: LimitsRepoMapper;

  constructor() {
    this.repoMapper = new LimitsRepoMapper();
  }

  async getLimitConfig(id: any): Promise<LimitConfiguration> {
    const limitConfigProps = await this.prismaService.limitConfiguration.findUnique({ where: { id: id } });
    return LimitConfiguration.createLimitConfiguration(limitConfigProps);
  }

  async getAllLimitConfigs(): Promise<LimitConfiguration[]> {
    const allLimitConfigs = await this.prismaService.limitConfiguration.findMany({ orderBy: { priority: "desc" } });
    return allLimitConfigs.map(config => LimitConfiguration.createLimitConfiguration(config));
  }

  async addLimitConfig(limitConfig: LimitConfiguration): Promise<LimitConfiguration> {
    const limitConfigProps = await this.prismaService.limitConfiguration.create({
      data: this.repoMapper.toCreateLimitConfiguration(limitConfig),
    });
    return LimitConfiguration.createLimitConfiguration(limitConfigProps);
  }
}
