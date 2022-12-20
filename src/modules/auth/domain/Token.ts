import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";
import * as crypto from "crypto";
import { Token as TokenModel, TokenType } from "@prisma/client";
import { isAfter } from "date-fns";

export class TokenProps implements Partial<TokenModel> {
  id: string; //token hash, using this attribute as _id to avoid having separate index on token
  userID: string;
  tokenType: TokenType;
  expiryTime?: Date | null;
  isUsed: boolean; // its not needed we delete the token
  createdTimestamp?: Date;
  updatedTimestamp?: Date;
}

export const tokenValidationKeys: KeysRequired<TokenProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().required(),
  userID: Joi.string().required(),
  tokenType: Joi.string()
    .valid(...Object.values(TokenType))
    .default(TokenType.REFRESH_TOKEN),
  expiryTime: Joi.date().optional(),
  isUsed: Joi.boolean().default(false),
};

export const tokenJoiSchema = Joi.object(tokenValidationKeys).options({ allowUnknown: true });

export class Token extends AggregateRoot<TokenProps> {
  private constructor(tokenProps: TokenProps) {
    super(tokenProps);
  }

  public static createTokenObject(props: Partial<TokenProps>): Token {
    return new Token(Joi.attempt(props, tokenJoiSchema));
  }

  public static saltifyToken(rawToken: string, salt: string) {
    return crypto.pbkdf2Sync(rawToken, salt, 1000, 64, "sha512").toString("hex");
  }

  public static generateToken(userId: string): { rawToken: string; saltifiedToken: string } {
    const rawToken = crypto.randomBytes(128).toString("hex");
    return {
      rawToken,
      saltifiedToken: this.saltifyToken(rawToken, userId),
    };
  }

  public isExpired(): boolean {
    return this.props.isUsed || (this.props.expiryTime && isAfter(new Date(), this.props.expiryTime));
  }

  public isMatching(rawToken: string): boolean {
    return !this.isExpired() && this.props.id === Token.saltifyToken(rawToken, this.props.userID);
  }
}
