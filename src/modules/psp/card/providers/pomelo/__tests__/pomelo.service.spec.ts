import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../../core/utils/WinstonModule";
import { PomeloRepo } from "../repos/pomelo.repo";
import { PomeloService } from "../pomelo.service";
import { LocationService } from "../../../../../common/location.service";
import { getMockPomeloRepoWithDefaults } from "../mocks/mock.pomelo.repo";
import { getMockLocationServiceWithDefaults } from "../../../../../common/mocks/mock.location.service";
import { ConsumerService } from "../../../../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../../../consumer/mocks/mock.consumer.service";
import { POMELO_REPO_PROVIDER } from "../repos/pomelo.repo.module";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { getRandomActiveConsumer } from "../../../../../../modules/consumer/test_utils/test.utils";
import { LocationDTO } from "../../../../../../modules/common/dto/LocationDTO";
import { PomeloClient } from "../pomelo.client";
import { getMockPomeloClientWithDefaults } from "../mocks/mock.pomelo.client";
import { ClientUserStatus } from "../dto/pomelo.client.dto";
import { CardProvider, NobaCard, NobaCardStatus, NobaCardType } from "../../../domain/NobaCard";
import { PomeloUser } from "../domain/PomeloUser";
import { PomeloCard } from "../domain/PomeloCard";
import { ServiceErrorCode, ServiceException } from "../../../../../../core/exception/service.exception";

describe("PomeloServiceTests", () => {
  jest.setTimeout(20000);

  let pomeloService: PomeloService;
  let pomeloRepo: PomeloRepo;
  let locationService: LocationService;
  let consumerService: ConsumerService;
  let pomeloClient: PomeloClient;

  let app: TestingModule;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    pomeloRepo = getMockPomeloRepoWithDefaults();
    locationService = getMockLocationServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    pomeloClient = getMockPomeloClientWithDefaults();

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: POMELO_REPO_PROVIDER,
          useFactory: () => instance(pomeloRepo),
        },
        {
          provide: LocationService,
          useFactory: () => instance(locationService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: PomeloClient,
          useFactory: () => instance(pomeloClient),
        },
        PomeloService,
      ],
    }).compile();

    pomeloService = app.get<PomeloService>(PomeloService);
  });

  afterEach(async () => {
    app.close();
  });

  describe("createCard", () => {
    it("should create user and card in Pomelo when request comes for first time", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const locationDetails: LocationDTO = {
        countryName: "Colombia",
        countryISOCode: "CO",
        alpha3ISOCode: "COL",
        dialingPrefix: "57",
        subdivisions: [
          {
            code: "CO-DC",
            name: "Distrito Capital de Bogotá",
          },
          {
            code: "BO",
            name: "Bolívar",
          },
        ],
      };

      const pomeloUser: PomeloUser = {
        id: "fake-id-123",
        pomeloID: "123",
        consumerID: consumer.props.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      const nobaCard: NobaCard = {
        id: "noba-card-1234",
        consumerID: consumer.props.id,
        type: NobaCardType.VIRTUAL,
        status: NobaCardStatus.ACTIVE,
        last4Digits: "1234",
        provider: CardProvider.POMELO,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      const pomeloCard: PomeloCard = {
        id: "fake-id-123",
        pomeloCardID: "pomelo-card-1234",
        pomeloUserID: pomeloUser.id,
        nobaCardID: nobaCard.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      when(locationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn(locationDetails);
      when(pomeloClient.createUser(anyString(), anything())).thenResolve({
        id: pomeloUser.pomeloID,
        status: ClientUserStatus.ACTIVE,
      });

      when(pomeloClient.createCard(anyString(), anything())).thenResolve({
        id: pomeloCard.pomeloCardID,
        status: NobaCardStatus.ACTIVE,
        cardType: NobaCardType.VIRTUAL,
        lastFour: nobaCard.last4Digits,
        startDate: "2020-01-01",
        productType: "Card",
        shipmentID: null,
        userID: pomeloUser.pomeloID,
        provider: "MasterCard",
      });

      when(pomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(pomeloRepo.createPomeloUser(anything())).thenResolve(pomeloUser);
      when(pomeloRepo.createPomeloCard(anything())).thenResolve(nobaCard);

      const createdCard = await pomeloService.createCard(consumer, NobaCardType.VIRTUAL);

      expect(createdCard).toEqual(nobaCard);

      verify(
        pomeloClient.createUser(
          consumer.props.id,
          deepEqual({
            name: consumer.props.firstName,
            surname: consumer.props.lastName,
            identification_type: "",
            identification_value: "",
            birthdate: consumer.props.dateOfBirth,
            gender: consumer.props.gender,
            email: consumer.props.email,
            phone: consumer.props.phone.replace("+57", ""),
            operation_country: locationDetails.alpha3ISOCode,
            legal_address: {
              street_name: consumer.props.address.streetLine1,
              additional_info: consumer.props.address.streetLine2,
              zip_code: consumer.props.address.postalCode,
              city: consumer.props.address.city,
              region: "Distrito Capital de Bogotá",
              country: locationDetails.alpha3ISOCode,
            },
          }),
        ),
      ).once();

      verify(
        pomeloClient.createCard(
          `${pomeloUser.id}-${NobaCardType.VIRTUAL}`,
          deepEqual({
            user_id: pomeloUser.pomeloID,
            card_type: NobaCardType.VIRTUAL,
          }),
        ),
      ).once();

      verify(
        pomeloRepo.createPomeloUser(
          deepEqual({
            consumerID: consumer.props.id,
            pomeloUserID: pomeloUser.pomeloID,
          }),
        ),
      ).once();

      verify(
        pomeloRepo.createPomeloCard(
          deepEqual({
            pomeloCardID: pomeloCard.pomeloCardID,
            pomeloUserID: pomeloUser.pomeloID,
            nobaConsumerID: consumer.props.id,
            status: NobaCardStatus.ACTIVE,
            type: NobaCardType.VIRTUAL,
            last4Digits: nobaCard.last4Digits,
          }),
        ),
      ).once();
    });

    it("should create card and add it to existing Pomelo user when user exists", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const locationDetails: LocationDTO = {
        countryName: "Colombia",
        countryISOCode: "CO",
        alpha3ISOCode: "COL",
        dialingPrefix: "57",
        subdivisions: [
          {
            code: "CO-DC",
            name: "Distrito Capital de Bogotá",
          },
          {
            code: "BO",
            name: "Bolívar",
          },
        ],
      };

      const pomeloUser: PomeloUser = {
        id: "fake-id-123",
        pomeloID: "123",
        consumerID: consumer.props.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      const nobaCard: NobaCard = {
        id: "noba-card-1234",
        consumerID: consumer.props.id,
        type: NobaCardType.VIRTUAL,
        status: NobaCardStatus.ACTIVE,
        last4Digits: "1234",
        provider: CardProvider.POMELO,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      const pomeloCard: PomeloCard = {
        id: "fake-id-123",
        pomeloCardID: "pomelo-card-1234",
        pomeloUserID: pomeloUser.id,
        nobaCardID: nobaCard.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      when(locationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn(locationDetails);

      when(pomeloClient.createCard(anyString(), anything())).thenResolve({
        id: pomeloCard.pomeloCardID,
        status: NobaCardStatus.ACTIVE,
        cardType: NobaCardType.VIRTUAL,
        lastFour: nobaCard.last4Digits,
        startDate: "2020-01-01",
        productType: "Card",
        shipmentID: null,
        userID: pomeloUser.pomeloID,
        provider: "MasterCard",
      });

      when(pomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(pomeloUser);
      when(pomeloRepo.createPomeloCard(anything())).thenResolve(nobaCard);

      const createdCard = await pomeloService.createCard(consumer, NobaCardType.VIRTUAL);

      expect(createdCard).toEqual(nobaCard);

      verify(pomeloClient.createUser(anyString(), anything())).never();

      verify(
        pomeloClient.createCard(
          `${pomeloUser.id}-${NobaCardType.VIRTUAL}`,
          deepEqual({
            user_id: pomeloUser.pomeloID,
            card_type: NobaCardType.VIRTUAL,
          }),
        ),
      ).once();

      verify(
        pomeloRepo.createPomeloCard(
          deepEqual({
            pomeloCardID: pomeloCard.pomeloCardID,
            pomeloUserID: pomeloUser.pomeloID,
            nobaConsumerID: consumer.props.id,
            status: NobaCardStatus.ACTIVE,
            type: NobaCardType.VIRTUAL,
            last4Digits: nobaCard.last4Digits,
          }),
        ),
      ).once();
    });

    it("should throw 'ServiceException' when locationDetails is not found", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");

      when(pomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);

      when(locationService.getLocationDetails("CO")).thenReturn(null);

      await expect(async () => await pomeloService.createCard(consumer, NobaCardType.VIRTUAL)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw 'ServiceException' when subdivision details does not exist", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const locationDetails: LocationDTO = {
        countryName: "Colombia",
        countryISOCode: "CO",
        alpha3ISOCode: "COL",
        dialingPrefix: "57",
        subdivisions: [
          {
            code: "BO",
            name: "Bolívar",
          },
        ],
      };

      when(pomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(locationService.getLocationDetails("CO")).thenReturn(locationDetails);

      await expect(async () => await pomeloService.createCard(consumer, NobaCardType.VIRTUAL)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should forward ServiceException thrown by PomeloClient", async () => {
      const consumer = getRandomActiveConsumer("57", "CO");
      const locationDetails: LocationDTO = {
        countryName: "Colombia",
        countryISOCode: "CO",
        alpha3ISOCode: "COL",
        dialingPrefix: "57",
        subdivisions: [
          {
            code: "CO-DC",
            name: "Distrito Capital de Bogotá",
          },
          {
            code: "BO",
            name: "Bolívar",
          },
        ],
      };

      const pomeloUser: PomeloUser = {
        id: "fake-id-123",
        pomeloID: "123",
        consumerID: consumer.props.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      const nobaCard: NobaCard = {
        id: "noba-card-1234",
        consumerID: consumer.props.id,
        type: NobaCardType.VIRTUAL,
        status: NobaCardStatus.ACTIVE,
        last4Digits: "1234",
        provider: CardProvider.POMELO,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      when(locationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn(locationDetails);
      when(pomeloClient.createUser(anyString(), anything())).thenResolve({
        id: pomeloUser.pomeloID,
        status: ClientUserStatus.ACTIVE,
      });

      when(pomeloClient.createCard(anyString(), anything())).thenReject(
        new ServiceException({
          message: "Pomelo User does not exist",
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        }),
      );

      when(pomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(pomeloRepo.createPomeloUser(anything())).thenResolve(pomeloUser);

      await expect(async () => await pomeloService.createCard(consumer, NobaCardType.VIRTUAL)).rejects.toThrow(
        ServiceException,
      );
    });
  });
});
