import { Module } from "@nestjs/common";
import { VerificationController } from "./verification.controller";
import { VerificationService } from "./verification.service";
import { ConfigModule } from "@nestjs/config";
import { ConsumerModule } from "../consumer/consumer.module";
import { Sardine } from "./integrations/Sardine";
import { MongoDBVerificationDataRepo } from "./repos/MongoDBVerificationDataRepo";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { DBProvider } from "../../infraproviders/DBProvider";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [ConfigModule, ConsumerModule, InfraProvidersModule, CommonModule],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    DBProvider,
    {
      provide: "IDVProvider",
      useClass: Sardine,
    },
    {
      provide: "VerificationDataRepo",
      useClass: MongoDBVerificationDataRepo,
    },
  ],
  exports: [VerificationService], //Need to access in PublicController
})
export class VerificationModule {}
