/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type NewAccessTokenRequestDTO = {
  /**
   * userId of user who owns the refresh token
   */
  userID: string;
  /**
   * Refresh token to get new acess token
   */
  refreshToken: string;
};
