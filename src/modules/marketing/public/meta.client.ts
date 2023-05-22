import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { META_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { MetaConfigs } from "../../../config/configtypes/MetaConfigs";
import { EventRequest, ServerEvent, UserData } from "facebook-nodejs-business-sdk";
import { MetaEvent } from "../dto/meta.service.dto";
import { uuid } from "uuidv4";

@Injectable()
export class MetaClient {
  private readonly pixelID: string;
  private readonly accessToken: string;
  private readonly testEventCode: string;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    const metaConfigs: MetaConfigs = configService.get<MetaConfigs>(META_CONFIG_KEY);
    this.pixelID = metaConfigs.pixelID;
    this.accessToken = metaConfigs.accessToken;
    this.testEventCode = metaConfigs.testEventCode;
  }

  async raiseEvent(event: MetaEvent): Promise<void> {
    const userData = new UserData();
    userData.setExternalId(event.userData.id);
    if (event.userData.email) userData.setEmail(event.userData.email);
    if (event.userData.phone) userData.setPhone(event.userData.phone);
    if (event.userData.firstName) userData.setFirstName(event.userData.firstName);
    if (event.userData.lastName) userData.setLastName(event.userData.lastName);
    if (event.userData.country) userData.setCountry(event.userData.country);

    const serverEvent = new ServerEvent()
      .setEventId(uuid())
      .setEventName(event.eventName.toString())
      .setEventTime(Math.round(Date.now() / 1000))
      .setActionSource("website")
      .setUserData(userData);
    const eventsData = [serverEvent];
    const eventRequest = new EventRequest(this.accessToken, this.pixelID).setEvents(eventsData);
    if (this.testEventCode) {
      this.logger.info(`Setting Meta test event code to: ${this.testEventCode}`);
      eventRequest.setTestEventCode(this.testEventCode);
    }

    this.logger.info(`Sending event to Meta: ${JSON.stringify(event)}`);
    const response = await eventRequest.execute();
    this.logger.info(`Response from Meta: ${JSON.stringify(response)}`);
  }
}
