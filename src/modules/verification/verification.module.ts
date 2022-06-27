import { Module } from "@nestjs/common";
import { VerificationController } from "./verification.controller";
import { VerificationService } from "./verification.service";
import { ConfigModule } from "@nestjs/config";
import { UserModule } from "../user/user.module";
import { Sardine } from "./integrations/Sardine";
import { MongoDBVerificationDataRepo } from "./repos/MongoDBVerificationDataRepo";
import { InfraProvidersModule } from "src/infraproviders/infra.module";
import { DBProvider } from "src/infraproviders/DBProvider";

@Module({
  imports: [ConfigModule, UserModule, InfraProvidersModule],
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
