import { Module } from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { MongoDBOtpRepo } from "../auth/repo/MongoDBOtpRepo";
import { CommonModule } from "../common/common.module";
import { ConsumerController } from "./consumer.controller";
import { ConsumerService } from "./consumer.service";
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
    {
      provide: "OTPRepo",
      useClass: MongoDBOtpRepo,
    },
  ],
  exports: [ConsumerService],
})
export class ConsumerModule {}
