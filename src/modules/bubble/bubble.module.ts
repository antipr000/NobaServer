import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { BubbleClient } from "./bubble.client";

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [BubbleClient],
  exports: [BubbleClient],
})
export class BubbleModule {}
