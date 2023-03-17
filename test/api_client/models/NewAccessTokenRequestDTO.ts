/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type NewAccessTokenRequestDTO = {
  /**
   * ID of user who owns the refresh token
   */
  userID: string;
  /**
   * Refresh token to get new access token
   */
  refreshToken: string;
  /**
   * Session key, if known
   */
  sessionKey?: string;
};
