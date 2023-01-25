import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLConsumerRepo } from "./sql.consumer.repo";
import { CommonModule } from "../../../modules/common/common.module";

const ConsumerRepoProvider = {
  provide: "ConsumerRepo",
  useClass: SQLConsumerRepo,
};

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [ConsumerRepoProvider],
  exports: [ConsumerRepoProvider], //Need to access in PublicController
})
export class ConsumerRepoModule {}
