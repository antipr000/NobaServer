import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLCircleRepo } from "./SQLCircleRepo";

const CircleRepoProvider = {
  provide: "CircleRepo",
  useClass: SQLCircleRepo,
};

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [CircleRepoProvider],
  exports: [CircleRepoProvider],
})
export class CircleRepoModule {}
