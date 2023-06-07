import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLCircleRepo } from "./sql.circle.repo";
import { CommonModule } from "../../../modules/common/common.module";

const CircleRepoProvider = {
  provide: "CircleRepo",
  useClass: SQLCircleRepo,
};

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [CircleRepoProvider],
  exports: [CircleRepoProvider],
})
export class CircleRepoModule {}
