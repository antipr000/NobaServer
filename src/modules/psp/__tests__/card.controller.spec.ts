import { Test, TestingModule } from "@nestjs/testing";
import { CardController } from "../card/card.controller";
import { CardService } from "../card/card.service";
import { getMockCardServiceWithDefaults } from "../card/mocks/mock.card.service";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { getRandomActiveConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { CardProvider, NobaCardStatus, NobaCardType } from "../card/domain/NobaCard";
import { getRandomNobaCard } from "../card/test_utils/util";

describe("CardController tests", () => {
  let mockCardService: CardService;
  let cardController: CardController;
  let app: TestingModule;

  beforeEach(async () => {
    mockCardService = getMockCardServiceWithDefaults();

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        {
          provide: CardService,
          useFactory: () => instance(mockCardService),
        },
        CardController,
      ],
    }).compile();

    cardController = app.get<CardController>(CardController);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("createCard", () => {
    it("should create a card", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const nobaCard = getRandomNobaCard(consumer.props.id, NobaCardStatus.ACTIVE);
      when(mockCardService.createCard(consumer.props.id, NobaCardType.VIRTUAL)).thenResolve(nobaCard);
      const card = await cardController.createCard(consumer, {
        type: NobaCardType.VIRTUAL,
      });
      expect(card).toStrictEqual({
        id: nobaCard.id,
        lastFourDigits: nobaCard.last4Digits,
        status: nobaCard.status,
        type: nobaCard.type,
        consumerID: nobaCard.consumerID,
        provider: nobaCard.provider,
      });
    });
  });

  describe("getAllCardsForConsumer", () => {
    it("should return all cards for consumer", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const nobaCard = getRandomNobaCard(consumer.props.id, NobaCardStatus.ACTIVE);
      when(mockCardService.getAllCardsForConsumer(consumer.props.id)).thenResolve([nobaCard]);
      const cards = await cardController.getAllCardsForConsumer(consumer);
      expect(cards).toStrictEqual([
        {
          id: nobaCard.id,
          lastFourDigits: nobaCard.last4Digits,
          status: nobaCard.status,
          type: nobaCard.type,
          consumerID: nobaCard.consumerID,
          provider: nobaCard.provider,
        },
      ]);
    });
  });

  describe("getCard", () => {
    it("should return a card", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const nobaCard = getRandomNobaCard(consumer.props.id, NobaCardStatus.ACTIVE);
      when(mockCardService.getCard(consumer.props.id, nobaCard.id)).thenResolve(nobaCard);
      const card = await cardController.getCard(consumer, nobaCard.id);
      expect(card).toStrictEqual({
        id: nobaCard.id,
        lastFourDigits: nobaCard.last4Digits,
        status: nobaCard.status,
        type: nobaCard.type,
        consumerID: nobaCard.consumerID,
        provider: nobaCard.provider,
      });
    });
  });

  describe("getWebViewToken", () => {
    it("should return a web view token", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");

      when(mockCardService.getWebViewToken("fake-card-id", consumer.props.id)).thenResolve({
        accessToken: "fake-token",
        providerCardID: "fake-provider-card-id",
        provider: CardProvider.POMELO,
      });

      const token = await cardController.getWebViewToken(consumer, "fake-card-id");
      expect(token).toStrictEqual({
        accessToken: "fake-token",
        providerCardID: "fake-provider-card-id",
        provider: CardProvider.POMELO,
      });
    });
  });
});
