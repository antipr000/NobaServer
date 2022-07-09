import { Module } from "@nestjs/common";
import { ConsumerController } from "./consumer.controller";
import { ConsumerService } from "./consumer.service";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { MongoDBConsumerRepo } from "./repos/MongoDBConsumerRepo";

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [ConsumerController],
  providers: [
    ConsumerService,
    DBProvider,
    {
      provide: "ConsumerRepo",
      useClass: MongoDBConsumerRepo,
    },
  ],
  exports: [ConsumerService],
})
export class ConsumerModule {}
