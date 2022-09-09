/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CaseNotificationDataDTO } from "./CaseNotificationDataDTO";

export type CaseNotificationWebhookRequestDTO = {
  id: string;
  type: string;
  timestamp: string;
  data: CaseNotificationDataDTO;
};
