import { AggregateRoot } from "../../../core/domain/AggregateRoot";
import { BaseProps, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { KeysRequired } from "../../common/domain/Types";
import Joi from "joi";
import * as crypto from "crypto";

export enum TokenType {
  REFRESH_TOKEN = "REFRESH_TOKEN",
}

export interface TokenProps extends BaseProps {
  _id: string; //token hash, using this attribute as _id to avoid having separate index on token
  userId: string;
  tokenType: TokenType;
  expiryTime?: number;
  isUsed: boolean; // its not needed we delete the token
}

export const tokenValidationKeys: KeysRequired<TokenProps> = {
  ...basePropsJoiSchemaKeys,
  _id: Joi.string().required(),
  userId: Joi.string().required(),
  tokenType: Joi.string().valid(Object.values(TokenType)),
  expiryTime: Joi.number().optional(),
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
    return this.props.isUsed || (this.props.expiryTime && this.props.expiryTime < Date.now());
  }

  public isMatching(rawToken: string): boolean {
    return !this.isExpired() && this.props._id === Token.saltifyToken(rawToken, this.props.userId);
  }
}
