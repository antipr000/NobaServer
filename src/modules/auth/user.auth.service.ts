import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
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

  protected async getUserId(emailOrPhone: string): Promise<string> {
    const consumer: Consumer = await this.consumerService.getOrCreateConsumerConditionally(emailOrPhone);
    if (consumer.props.isDisabled) {
      throw new ForbiddenException("User account is deactivated!");
    }
    return consumer.props.id;
  }

  protected async isUserSignedUp(emailOrPhone: string): Promise<boolean> {
    const consumer = await this.consumerService.findConsumerByEmailOrPhone(emailOrPhone);
    if (consumer.isSuccess) {
      const consumerData = consumer.getValue();
      return !consumerData.props.isDisabled;
    } else {
      return false;
    }
  }
}
