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
import { NobaCardStatus, NobaCardType } from "../domain/NobaCard";
import { ServiceException } from "../../../../core/exception/service.exception";

describe("CardService tests", () => {
  let cardService: CardService;
  let mockPomeloService: PomeloService;
  let mockCardProviderFactory: CardProviderFactory;
  let mockConsumerService: ConsumerService;
  let app: TestingModule;

  beforeEach(async () => {
    mockPomeloService = getMockPomeloServiceWithDefaults();
    mockCardProviderFactory = getMockCardProviderFactoryWithDefaults();
    mockConsumerService = getMockConsumerServiceWithDefaults();

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
});
