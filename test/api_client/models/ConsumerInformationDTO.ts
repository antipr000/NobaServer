/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type ConsumerInformationDTO = {
  /**
   * The unique identifier of the user
   */
  id: string;
  /**
   * The first name of the user
   */
  firstName: string;
  /**
   * The last name of the user
   */
  lastName: string;
  /**
   * The handle or 'tag' of the user, without $ prefix
   */
  handle?: string;
};
