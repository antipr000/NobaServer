import { Module } from "@nestjs/common";
import { ConsumerController } from "./consumer.controller";
import { ConsumerService } from "./consumer.service";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "../common/common.module";
import { ConsumerRepoModule, ConsumerRepoProvider } from "./repos/ConsumerRepoModule";

@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule, ConsumerRepoModule],
  controllers: [ConsumerController],
  providers: [ConsumerService, DBProvider, ConsumerRepoProvider],
  exports: [ConsumerService, ConsumerRepoProvider], //Need to access in PublicController
})
export class ConsumerModule {}
