import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { MetaClient } from "./meta.client";
import { MetaService } from "./meta.service";

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [MetaClient, MetaService],
  exports: [MetaService],
})
export class MetaPublicModule {}
