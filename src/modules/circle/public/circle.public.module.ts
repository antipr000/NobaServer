import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { CircleRepoModule } from "../repos/circle.repo.module";
import { CircleClient } from "./circle.client";
import { CircleController } from "./circle.controller";
import { CircleService } from "./circle.service";

@Module({
  imports: [CircleRepoModule, CommonModule],
  controllers: [CircleController],
  providers: [CircleClient, CircleService],
  exports: [CircleService],
})
export class CirclePublicModule {}
