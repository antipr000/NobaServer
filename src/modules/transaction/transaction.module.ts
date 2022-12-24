import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";

@Module({
  imports: [InfraProvidersModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
