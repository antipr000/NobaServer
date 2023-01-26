/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ContactPhoneDTO } from "./ContactPhoneDTO";

export type ContactConsumerRequestDTO = {
  phoneNumbers: Array<ContactPhoneDTO>;
  emails: Array<string>;
};
