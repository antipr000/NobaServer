import { BadRequestException, Inject, Injectable } from "@nestjs/common";
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

  protected async getUserId(emailOrPhone: string, partnerID: string, partnerUserID?: string): Promise<string> {
    if (!partnerID || partnerID.length == 0) {
      throw new BadRequestException("PartnerID is required");
    }
    const consumer: Consumer = await this.consumerService.getOrCreateConsumerConditionally(emailOrPhone, partnerID);
    return consumer.props._id;
  }

  protected async isUserSignedUp(emailOrPhone: string): Promise<boolean> {
    return (await this.consumerService.findConsumerByEmailOrPhone(emailOrPhone)) != null;
  }
}
