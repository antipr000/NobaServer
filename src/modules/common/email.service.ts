import { Injectable } from "@nestjs/common";
import { SendGridConfigs } from "../../config/configtypes/SendGridConfigs";
import { SENDGRID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import * as sgMail from "@sendgrid/mail";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

const SUPPORT_URL = "noba.com/support"; //TODO: Fix this
@Injectable()
export class EmailService {
  constructor(configService: CustomConfigService) {
    const sendGridApiKey = configService.get<SendGridConfigs>(SENDGRID_CONFIG_KEY).apiKey;
    sgMail.setApiKey(sendGridApiKey);
  }

  public async sendOtp(email: string, otp: string, name?: string) {
    const msg = {
      to: email,
      from: "Noba Pay <auth@noba.com>",
      templateId: "d-62a393f5f89949f5a5a3d244a51ed2e7", //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        user: name ?? "",
        one_time_password: otp,
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycApprovedEmail(firstName: string, lastName: string, email: string) {
    const fullName = firstName + " " + lastName;

    const msg = {
      to: email,
      from: "Noba Pay <auth@noba.com>",
      templateId: "d-2d55cada60ab46209d6d5bcfe9c450d7",
      dynamicTemplateData: {
        username: fullName ?? "",
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycDenied(firstName: string, lastName: string, email: string) {
    const fullName = firstName + " " + lastName;

    const msg = {
      to: email,
      from: "Noba Pay <auth@noba.com>",
      templateId: "d-fac2f33374c443cb855641727a735708",
      dynamicTemplateData: {
        username: fullName ?? "",
        duration: 2, // TODO: Remove hardcoded duration
      },
    };

    await sgMail.send(msg);
  }

  public async sendKycPendingOrFlagged(firstName: string, lastName: string, email: string) {
    const fullName = firstName + " " + lastName;
    const minutesFromNow = 10; // TODO: Remove hardcoded minutes
    const futureDate = new Date(new Date().getTime() + minutesFromNow * 60000).toUTCString();

    const msg = {
      to: email,
      from: "Noba Pay <auth@noba.com>",
      templateId: "d-d25d29442cf44338b72e15ea75bcab26",
      dynamicTemplateData: {
        username: fullName ?? "",
        datetimestamp: futureDate,
      },
    };

    await sgMail.send(msg);
  }

  public async sendCardAddedEmail(
    firstName: string,
    lastName: string,
    email: string,
    cardNetwork: string,
    last4Digits: string,
  ) {
    const fullName = firstName + " " + lastName;

    const msg = {
      to: email,
      from: "Noba Pay <auth@noba.com>",
      templateId: "d-8bb9892cbbc1405aa9f833229c9db2e2",
      dynamicTemplateData: {
        username: fullName ?? "",
        card_network: cardNetwork,
        last_4_digits_of_card: last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  public async sendCardAdditionFailedEmail(
    firstName: string,
    lastName: string,
    email: string,
    cardNetwork: string,
    last4Digits: string,
  ) {
    const fullName = firstName + " " + lastName;

    const msg = {
      to: email,
      from: "Noba Pay <auth@noba.com>",
      templateId: "d-cb1c929f24734c9099f7ba90e08f53ee",
      dynamicTemplateData: {
        username: fullName ?? "",
        card_network: cardNetwork,
        last_4_digits_of_card: last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }

  public async sendCardDeletedEmail(
    firstName: string,
    lastName: string,
    email: string,
    cardNetwork: string,
    last4Digits: string,
  ) {
    const fullName = firstName + " " + lastName;

    const msg = {
      to: email,
      from: "Noba Pay <auth@noba.com>",
      templateId: "d-b0e06a32f6674552979243a2542409b4",
      dynamicTemplateData: {
        username: fullName ?? "",
        card_network: cardNetwork,
        last_4_digits_of_card: last4Digits,
        support_url: SUPPORT_URL,
      },
    };

    await sgMail.send(msg);
  }
}
