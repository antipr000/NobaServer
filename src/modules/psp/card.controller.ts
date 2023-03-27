import { Body, Controller, Get, HttpStatus, Inject, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiHeaders, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { Logger } from "winston";
import { Role } from "../auth/role.enum";
import { Roles } from "../auth/roles.decorator";
import { Consumer } from "../consumer/domain/Consumer";
import { AuthUser } from "../auth/auth.decorator";
import { CardCreateRequestDTO, CardResponseDTO } from "./dto/card.controller.dto";
import { CardService } from "./card/card.service";
import { CardMapper } from "./mapper/card.mapper";

@Roles(Role.CONSUMER)
@ApiBearerAuth("JWT-auth")
@Controller("v1/consumers/cards") // This defines the path prefix
@ApiTags("Consumer") // This determines where it shows up in the swagger docs. Seems fair for this to appear in the Consumer grouping.
@ApiHeaders(getCommonHeaders()) // Adds the requirement for all the X-Noba-xxx headers.
export class CardController {
  private readonly cardMapper: CardMapper;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly cardService: CardService,
  ) {
    this.cardMapper = new CardMapper();
  }

  @Post("/")
  @ApiOperation({ summary: "Create a new card for the consumer" })
  @ApiResponse({ status: HttpStatus.CREATED, type: CardResponseDTO })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async createCard(@AuthUser() consumer: Consumer, @Body() request: CardCreateRequestDTO): Promise<CardResponseDTO> {
    const card = await this.cardService.createCard(consumer.props.id, request.type);
    return this.cardMapper.toCardResponseDTO(card);
  }

  @Get("/")
  @ApiOperation({ summary: "Gets all cards for the consumer" })
  @ApiResponse({ status: HttpStatus.OK, type: Array<CardResponseDTO> })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async getAllCardsForConsumer(@AuthUser() consumer: Consumer): Promise<CardResponseDTO[]> {
    const cards = await this.cardService.getAllCardsForConsumer(consumer.props.id);
    return cards.map(card => this.cardMapper.toCardResponseDTO(card));
  }

  @Get("/:id")
  @ApiOperation({ summary: "Gets a specific card for the consumer" })
  @ApiResponse({ status: HttpStatus.OK, type: CardResponseDTO })
  @ApiForbiddenResponse({ description: "Logged-in user is not a Consumer" })
  async getCard(@AuthUser() consumer: Consumer, @Param("id") cardID: string): Promise<CardResponseDTO> {
    const card = await this.cardService.getCard(consumer.props.id, cardID);
    return this.cardMapper.toCardResponseDTO(card);
  }
}
