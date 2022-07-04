import { MongoDBConsumerRepo } from "./MongoDBConsumerRepo";
import { Module } from "@nestjs/common";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";

export const ConsumerRepoProvider = {
  provide: "ConsumerRepo",
  useClass: MongoDBConsumerRepo,
};

@Module({
  imports: [InfraProvidersModule],
  providers: [DBProvider, ConsumerRepoProvider],
  exports: [ConsumerRepoProvider],
})
export class ConsumerRepoModule {}
