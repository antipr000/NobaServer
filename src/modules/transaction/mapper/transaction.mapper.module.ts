import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { TransactionMappingService } from "./transaction.mapper.service";

export const TRANSACTION_MAPPING_SERVICE_PROVIDER = "TRANSACTION_MAPPING_SERVICE";

@Module({
  imports: [ConsumerModule],
  controllers: [],
  providers: [
    {
      provide: TRANSACTION_MAPPING_SERVICE_PROVIDER,
      useClass: TransactionMappingService,
    },
  ],
  exports: [TRANSACTION_MAPPING_SERVICE_PROVIDER],
})
export class TransactionMappingModule {}
