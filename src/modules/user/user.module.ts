import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { DetachPaymentMethodController, PaymentMethodsController } from "./paymentmethods.controller";
import { CheckoutPaymentMethodsService, StripePaymentMethodsService } from "./paymentmethods.service";
import { UserRepoModule, userRepoProvider } from "./repos/UserRepoModule";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule, UserRepoModule],
  controllers: [UserController, PaymentMethodsController, DetachPaymentMethodController],
  providers: [UserService, DBProvider, CheckoutPaymentMethodsService, StripePaymentMethodsService, userRepoProvider],
  exports: [UserService, userRepoProvider], //Need to access in PublicController
})
export class UserModule {}
