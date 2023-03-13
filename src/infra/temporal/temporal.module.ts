import { Module } from "@nestjs/common";
import { AlertModule } from "src/core/alerts/alert.module";
import { CommonModule } from "../../modules/common/common.module";
import { WorkflowExecutor } from "./workflow.executor";

@Module({
  imports: [CommonModule, AlertModule],
  controllers: [],
  providers: [WorkflowExecutor],
  exports: [WorkflowExecutor],
})
export class TemporalModule { }
