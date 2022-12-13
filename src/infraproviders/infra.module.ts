import { Module } from "@nestjs/common";
import { DBProvider } from "./DBProvider";
import { PrismaService } from "./PrismaService";

@Module({
  providers: [DBProvider, PrismaService],
  exports: [DBProvider, PrismaService],
})
export class InfraProvidersModule {}
