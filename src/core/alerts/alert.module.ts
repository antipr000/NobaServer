import { Module } from "@nestjs/common";
import { CustomConfigModule } from "../utils/AppConfigModule";
import { AlertService } from "./alert.service";

@Module({
  imports: [
    CustomConfigModule,
  ],
  controllers: [],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule { }
