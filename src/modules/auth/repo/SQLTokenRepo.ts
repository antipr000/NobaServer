import { Inject, Injectable } from "@nestjs/common";
import { ITokenRepo } from "./TokenRepo";
import { Token } from "../domain/Token";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { TokenRepoMapper } from "../mapper/TokenRepoMapper";
import { Prisma } from "@prisma/client";

@Injectable()
export class SQLTokenRepo implements ITokenRepo {
  @Inject()
  private readonly prismaService: PrismaService;

  private readonly tokenMapper: TokenRepoMapper;
  constructor() {
    this.tokenMapper = new TokenRepoMapper();
  }

  async getToken(rawTokenId: string, userId: string): Promise<Token> {
    const saltfiedId = Token.saltifyToken(rawTokenId, userId);
    const tokenProps = await this.prismaService.token.findUnique({ where: { id: saltfiedId } });
    return Token.createTokenObject(tokenProps);
  }

  async saveToken(token: Token): Promise<void> {
    const createTokenInput: Prisma.TokenCreateInput = this.tokenMapper.toCreateTokenInput(token);
    await this.prismaService.token.create({ data: createTokenInput });
  }

  async deleteToken(rawTokenId: string, userId: string): Promise<void> {
    const tokenID = Token.saltifyToken(rawTokenId, userId);
    await this.prismaService.token.delete({ where: { id: tokenID } });
  }
}
