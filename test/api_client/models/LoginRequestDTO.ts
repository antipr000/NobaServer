/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type LoginRequestDTO = {
  /**
   * Email or phone value to identify the user
   */
  emailOrPhone?: string;
  /**
   * Identity type of the user logging in
   */
  identityType: "CONSUMER" | "NOBA_ADMIN";
  /**
   * Whether or not to auto-create an account if not present
   */
  autoCreate?: boolean;
};
