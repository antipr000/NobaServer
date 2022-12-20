import { Module } from "@nestjs/common";
import { ConsumerModule } from "../consumer/consumer.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./jwt.strategy";
import { jwtConstants } from "./constants";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { CommonModule } from "../common/common.module";
import { UserAuthService } from "./user.auth.service";
import { AdminAuthService } from "./admin.auth.service";
import { AdminModule } from "../admin/admin.module";
import { HeaderValidationService } from "./header.validation.service";
import { NotificationsModule } from "../notifications/notification.module";
import { SQLTokenRepo } from "./repo/SQLTokenRepo";

@Module({
  imports: [
    ConsumerModule,
    AdminModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: "604800s" } /* 1 week */,
    }),
    InfraProvidersModule,
    ConfigModule,
    CommonModule,
    NotificationsModule,
  ],
  providers: [
    JwtStrategy,
    HeaderValidationService,
    DBProvider,
    {
      provide: "TokenRepo",
      useClass: SQLTokenRepo,
    },
    UserAuthService,
    AdminAuthService,
  ],
  controllers: [AuthController],
  exports: [HeaderValidationService],
})
export class AuthModule {}
