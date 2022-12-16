import { Inject, Injectable } from "@nestjs/common";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ITokenRepo } from "./TokenRepo";
import { TokenMapper } from "../mapper/TokenMapper";
import { Token } from "../domain/Token";
import { Logger } from "winston";

@Injectable()
export class MongoDBTokenRepo implements ITokenRepo {
  @Inject()
  private readonly dbProvider: DBProvider;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly tokenMapper: TokenMapper = new TokenMapper();

  async getToken(rawTokenId: string, userId: string): Promise<Token> {
    const saltfiedId = Token.saltifyToken(rawTokenId, userId);
    const tokenModel = await this.dbProvider.getTokenModel();
    const dbResp = await tokenModel.findById(saltfiedId);
    return this.tokenMapper.toDomain(dbResp);
  }
  async saveToken(token: Token): Promise<void> {
    const tokenModel = await this.dbProvider.getTokenModel();
    const dbResp = await tokenModel.create(token.props);
    this.logger.debug(`Token saved: ${dbResp}`);
  }

  async deleteToken(rawTokenId: string, userId: string): Promise<void> {
    const tokenModel = await this.dbProvider.getTokenModel();
    const _id = Token.saltifyToken(rawTokenId, userId);
    this.logger.info(`Deleting token with id: ${_id} with userId: ${userId}`);
    await tokenModel.deleteOne({ _id });
  }
}
