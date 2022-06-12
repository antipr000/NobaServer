import { MongoDBUserRepo } from "./MongoDBUserRepo";
import { IUserRepo } from "./UserRepo";
import { Module } from "@nestjs/common";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";

export const userRepoProvider = {
  provide: IUserRepo,
  useClass: MongoDBUserRepo,
};

@Module({
  imports: [InfraProvidersModule],
  providers: [DBProvider, userRepoProvider],
  exports: [userRepoProvider],
})
export class UserRepoModule {}
