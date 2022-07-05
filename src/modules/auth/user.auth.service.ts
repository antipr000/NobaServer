import { Inject, Injectable } from "@nestjs/common";
import { ConsumerService } from "../consumer/consumer.service";
import { AuthService } from "./auth.service";
import { consumerIdentityIdentifier } from "./domain/IdentityType";
import { Consumer } from "../consumer/domain/Consumer";

@Injectable()
export class UserAuthService extends AuthService {
  private readonly identityType: string = consumerIdentityIdentifier;

  @Inject()
  private readonly consumerService: ConsumerService;

  protected getIdentityType(): string {
    return this.identityType;
  }

  protected async getUserId(emailOrPhone: string, partnerID: string): Promise<string> {
    const consumer: Consumer = await this.consumerService.createConsumerIfFirstTimeLogin(emailOrPhone, partnerID);
    return consumer.props._id;
  }

  protected async isUserSignedUp(email: string): Promise<boolean> {
    // Signup & login flow for 'CONSUMER' is same. i.e.
    // If a user is not signed up (an account doesn't exist), user-account will be created.
    return true;
  }
}
