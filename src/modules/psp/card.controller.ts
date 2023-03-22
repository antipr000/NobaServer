import { Controller, HttpStatus, Inject, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeaders, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { Consumer } from "../consumer/domain/Consumer";
import { AuthUser } from "../auth/auth.decorator";
import { PomeloService } from "./pomelo/pomelo.service";
import { CardResponseDTO } from "./dto/card.controller.dto";

@Roles(Role.CONSUMER)
@ApiBearerAuth("JWT-auth")
@Controller("v1/consumers/cards") // This defines the path prefix
@ApiTags("Consumer") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping.
@ApiHeaders(getCommonHeaders()) // Adds the requirement for all the X-Noba-xxx headers.
export class CardController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly pomeloService: PomeloService,
  ) {}

  @Post("/")
  @ApiOperation({ summary: "Create a new card for the consumer" })
  @ApiResponse({ status: HttpStatus.CREATED, type: CardResponseDTO })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async createCard(@AuthUser() consumer: Consumer): Promise<CardResponseDTO> {
    const card = await this.pomeloService.createCard(consumer.props.id);
    return {
      id: card.id,
      providerUserID: card.userID,
      startDate: card.startDate,
      lastFour: card.lastFour,
    };
  }
}
