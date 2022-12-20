import { Prisma } from "@prisma/client";
import { Token } from "../domain/Token";

export class TokenRepoMapper {
  toCreateTokenInput(token: Token): Prisma.TokenCreateInput {
    return {
      id: token.props.id,
      isUsed: token.props.isUsed,
      userID: token.props.userID,
      tokenType: token.props.tokenType,
      expiryTime: token.props.expiryTime,
    };
  }
}
