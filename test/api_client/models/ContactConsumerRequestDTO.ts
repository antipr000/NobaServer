/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ContactPhoneDTO } from "./ContactPhoneDTO";

export type ContactConsumerRequestDTO = {
  id: string;
  phone: Array<ContactPhoneDTO>;
  email: Array<string>;
};
