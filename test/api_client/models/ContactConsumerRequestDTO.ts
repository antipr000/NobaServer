/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ContactPhoneDTO } from "./ContactPhoneDTO";

export type ContactConsumerRequestDTO = {
  id: string;
  phoneNumbers: Array<ContactPhoneDTO>;
  emails: Array<string>;
};
