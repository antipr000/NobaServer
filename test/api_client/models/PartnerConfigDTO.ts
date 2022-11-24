/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { NotificationConfigurationDTO } from "./NotificationConfigurationDTO";
import type { PartnerFeesDTO } from "./PartnerFeesDTO";

export type PartnerConfigDTO = {
  privateWallets?: boolean;
  viewOtherWallets?: boolean;
  bypassLogonOTP?: boolean;
  bypassWalletOTP?: boolean;
  cryptocurrencyAllowList?: Array<string>;
  fees: PartnerFeesDTO;
  notificationConfig: Array<NotificationConfigurationDTO>;
  logo?: string;
  logoSmall?: string;
};
