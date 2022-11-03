/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type IDVerificationURLResponseDTO = {
  /**
   * Unique ID for this identity verification request
   */
  id: string;
  /**
   * URL for identity verification document capture redirect
   */
  url: string;
  /**
   * Expiration time of the url (in ms since the epoch)
   */
  expiration: number;
};
