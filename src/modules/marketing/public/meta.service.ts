import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { MetaEvent } from "../dto/meta.service.dto";
import { MetaClient } from "./meta.client";

@Injectable()
export class MetaService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly metaClient: MetaClient;

  async raiseEvent(event: MetaEvent): Promise<void> {
    try {
      await this.metaClient.raiseEvent(event);
    } catch (err) {
      // Log an error but don't fail, as Meta events are best-effort
      this.logger.error(`Error raising meta event: ${JSON.stringify(event)} - ${JSON.stringify(err)}`);
    }
  }
}
