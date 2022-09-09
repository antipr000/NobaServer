/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DataDTO } from "./DataDTO";

export type DocumentVerificationWebhookRequestDTO = {
  id: string;
  type: string;
  timestamp: string;
  data: DataDTO;
};
