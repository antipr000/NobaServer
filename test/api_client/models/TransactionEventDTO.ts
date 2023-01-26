/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TransactionEventDTO = {
  /**
   * A simple message describing the event, in English
   */
  message: string;
  /**
   * The date and time the event occurred
   */
  timestamp?: string;
  /**
   * Whether the event should be hidden from user view (true) or exposed to the user (false)
   */
  internal?: boolean;
  /**
   * A more detailed description of the event, in English
   */
  details?: string;
  /**
   * A key used to identify this specific event, used for translation purposes
   */
  key?: string;
  /**
   * An array of parameters used to populate variables in the translated message
   */
  parameters?: Array<string>;
};
