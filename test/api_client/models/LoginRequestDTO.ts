/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type LoginRequestDTO = {
  /**
   * Email or phone value to identify the user
   */
  emailOrPhone?: string;
  /**
   * Whether or not to auto-create an account if not present
   */
  autoCreate?: boolean;
};
