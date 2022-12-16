import { Token } from "../domain/Token";
export interface ITokenRepo {
  getToken(rawTokenId: string, userId: string): Promise<Token>;
  saveToken(token: Token): Promise<void>;
  deleteToken(rawTokenId: string, userId: string): Promise<void>;
}
