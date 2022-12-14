import { Mapper } from "../../../core/infra/Mapper";
import { Token } from "../domain/Token";

export class TokenMapper implements Mapper<Token> {
  toDTO(t: Token, ...any: any[]) {
    throw new Error("Method not implemented");
  }

  toDomain(t: any): Token {
    return Token.createTokenObject(t);
  }
}
