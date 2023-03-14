import { Module } from "@nestjs/common";
import { CommonModule } from "../../modules/common/common.module";
import { WorkflowExecutor } from "./workflow.executor";

@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [WorkflowExecutor],
  exports: [WorkflowExecutor],
})
export class TemporalModule {}
