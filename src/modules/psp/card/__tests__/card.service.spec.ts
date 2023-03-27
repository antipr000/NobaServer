import { Test, TestingModule } from "@nestjs/testing";
import { ConsumerService } from "../../../../modules/consumer/consumer.service";
import { CardService } from "../card.service";
import { CardProviderFactory } from "../providers/card.provider.factory";
import { PomeloService } from "../providers/pomelo/pomelo.service";
import { getMockPomeloServiceWithDefaults } from "../providers/pomelo/mocks/mock.pomelo.service";
import { getMockCardProviderFactoryWithDefaults } from "../mocks/mock.card.provider.factory";
import { getMockConsumerServiceWithDefaults } from "../../../../modules/consumer/mocks/mock.consumer.service";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { getRandomActiveConsumer } from "../../../../modules/consumer/test_utils/test.utils";
import { getRandomNobaCard } from "../test_utils/util";
import { CardProvider, NobaCardStatus, NobaCardType } from "../domain/NobaCard";
import { ServiceException } from "../../../../core/exception/service.exception";
import { NobaCardRepo } from "../repos/card.repo";
import { getMockCardRepoWithDefaults } from "../mocks/mock.card.repo";
import { NOBA_CARD_REPO_PROVIDER } from "../repos/card.repo.module";

describe("CardService tests", () => {
  let cardService: CardService;
  let mockPomeloService: PomeloService;
  let mockCardProviderFactory: CardProviderFactory;
  let mockConsumerService: ConsumerService;
  let mockCardRepo: NobaCardRepo;
  let app: TestingModule;

  beforeEach(async () => {
    mockPomeloService = getMockPomeloServiceWithDefaults();
    mockCardProviderFactory = getMockCardProviderFactoryWithDefaults();
    mockConsumerService = getMockConsumerServiceWithDefaults();
    mockCardRepo = getMockCardRepoWithDefaults();

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        {
          provide: ConsumerService,
          useFactory: () => instance(mockConsumerService),
        },
        {
          provide: CardProviderFactory,
          useFactory: () => instance(mockCardProviderFactory),
        },
        {
          provide: NOBA_CARD_REPO_PROVIDER,
          useFactory: () => instance(mockCardRepo),
        },
        CardService,
      ],
    }).compile();

    cardService = app.get<CardService>(CardService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("createCard", () => {
    it("should create pomelo card for Colombian users", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const nobaCard = getRandomNobaCard(consumer.props.id, NobaCardStatus.ACTIVE);

      const pomeloInstance = instance(mockPomeloService);

      when(mockCardProviderFactory.getCardProviderService("CO")).thenReturn(pomeloInstance);
      when(mockConsumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(mockPomeloService.createCard(anything(), anyString())).thenResolve(nobaCard);

      const response = await cardService.createCard(consumer.props.id, NobaCardType.VIRTUAL);

      expect(response).toStrictEqual(nobaCard);

      verify(mockPomeloService.createCard(deepEqual(consumer), NobaCardType.VIRTUAL)).once();
    });

    it("should throw 'ServiceException' when consumer does not have address", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      consumer.props.address = null;

      when(mockConsumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);

      await expect(async () => await cardService.createCard(consumer.props.id, NobaCardType.VIRTUAL)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw 'ServiceException' if consumer with id does not exist", async () => {
      when(mockConsumerService.getActiveConsumer("fake-id")).thenResolve(null);

      await expect(async () => await cardService.createCard("fake-id", NobaCardType.VIRTUAL)).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("getAllCardsForConsumer", () => {
    it("should get all cards for consumer", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const nobaCard = getRandomNobaCard(consumer.props.id, NobaCardStatus.ACTIVE);

      when(mockConsumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(mockCardRepo.getCardsByConsumerID(consumer.props.id)).thenResolve([nobaCard]);

      const response = await cardService.getAllCardsForConsumer(consumer.props.id);

      expect(response).toStrictEqual([nobaCard]);
    });

    it("should throw 'ServiceException' if consumer with id does not exist", async () => {
      when(mockConsumerService.getActiveConsumer("fake-id")).thenResolve(null);

      await expect(async () => await cardService.getAllCardsForConsumer("fake-id")).rejects.toThrow(ServiceException);
    });

    it("should throw 'ServiceException' when consumerID is null", async () => {
      await expect(async () => await cardService.getAllCardsForConsumer(null)).rejects.toThrow(ServiceException);
    });
  });

  describe("getCard", () => {
    it("should get card by id", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const nobaCard = getRandomNobaCard(consumer.props.id, NobaCardStatus.ACTIVE);

      when(mockCardRepo.getCardByID(nobaCard.id)).thenResolve(nobaCard);

      const response = await cardService.getCard(nobaCard.id, consumer.props.id);

      expect(response).toStrictEqual(nobaCard);
    });

    it("should throw 'ServiceException' when card does not exist", async () => {
      when(mockCardRepo.getCardByID("fake-id")).thenResolve(null);

      await expect(async () => await cardService.getCard("fake-id", "fake-consumer-id")).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw 'ServiceException' when card does not belong to consumer", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const nobaCard = getRandomNobaCard(consumer.props.id, NobaCardStatus.ACTIVE);

      when(mockCardRepo.getCardByID(nobaCard.id)).thenResolve(nobaCard);

      await expect(async () => await cardService.getCard(nobaCard.id, "fake-consumer-id")).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw 'ServiceException' when cardID is null", async () => {
      await expect(async () => await cardService.getCard(null, "fake-consumer-id")).rejects.toThrow(ServiceException);
    });

    it("should throw 'ServiceException' when consumerID is null", async () => {
      await expect(async () => await cardService.getCard("fake-id", null)).rejects.toThrow(ServiceException);
    });
  });

  describe("getWebViewToken", () => {
    it("should get web view token", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const nobaCard = getRandomNobaCard(consumer.props.id, NobaCardStatus.ACTIVE);

      const pomeloInstance = instance(mockPomeloService);

      when(mockCardProviderFactory.getCardProviderServiceByProvider(CardProvider.POMELO)).thenReturn(pomeloInstance);
      when(mockConsumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(mockCardRepo.getCardByID(nobaCard.id)).thenResolve(nobaCard);
      when(mockPomeloService.getWebViewToken(deepEqual(nobaCard))).thenResolve({
        accessToken: "fake-token",
        providerCardID: "fake-pomelo-id",
      });

      const response = await cardService.getWebViewToken(nobaCard.id, consumer.props.id);

      expect(response).toStrictEqual({
        accessToken: "fake-token",
        providerCardID: "fake-pomelo-id",
      });
    });
  });
});
