import { Module } from "@nestjs/common";
import { KmsService } from "../../../../src/modules/common/kms.service";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLConsumerRepo } from "./SQLConsumerRepo";

const ConsumerRepoProvider = {
  provide: "ConsumerRepo",
  useClass: SQLConsumerRepo,
};

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [ConsumerRepoProvider, KmsService],
  exports: [ConsumerRepoProvider], //Need to access in PublicController
})
export class ConsumerRepoModule {}
