import { Test, TestingModule } from "@nestjs/testing";
import { POMELO_AFFINITY_GROUP, POMELO_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { PomeloRepo } from "../../repos/pomelo.repo";
import { PomeloService } from "../pomelo.service";
import { LocationService } from "../../../common/location.service";
import { getMockPomeloRepoWithDefaults } from "../../repos/mocks/mock.pomelo.repo";
import { getMockLocationServiceWithDefaults } from "../../../common/mocks/mock.location.service";
import { ConsumerService } from "../../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../consumer/mocks/mock.consumer.service";
import { POMELO_REPO_PROVIDER } from "../../repos/pomelo.repo.module";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { getRandomActiveConsumer } from "../../../consumer/test_utils/test.utils";
import { LocationDTO } from "../../../common/dto/LocationDTO";
import { PomeloClient } from "../pomelo.client";
import { getMockPomeloClientWithDefaults } from "../mocks/mock.pomelo.client";
import { ClientUserStatus } from "../../dto/pomelo.client.dto";
import { CardProvider, NobaCard, NobaCardStatus, NobaCardType } from "../../../psp/card/domain/NobaCard";
import { PomeloUser } from "../../domain/PomeloUser";
import { PomeloCard } from "../../domain/PomeloCard";
import { ServiceErrorCode, ServiceException } from "../../../../core/exception/service.exception";
import { Identification } from "../../../consumer/domain/Identification";
import CryptoJS from "crypto-js";

describe("PomeloServiceTests", () => {
  jest.setTimeout(20000);

  let pomeloService: PomeloService;
  let mockPomeloRepo: PomeloRepo;
  let mockLocationService: LocationService;
  let mockConsumerService: ConsumerService;
  let mockPomeloClient: PomeloClient;

  let app: TestingModule;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [POMELO_CONFIG_KEY]: {
        [POMELO_AFFINITY_GROUP]: "fake-ag",
      },
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    mockPomeloRepo = getMockPomeloRepoWithDefaults();
    mockLocationService = getMockLocationServiceWithDefaults();
    mockConsumerService = getMockConsumerServiceWithDefaults();
    mockPomeloClient = getMockPomeloClientWithDefaults();

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: POMELO_REPO_PROVIDER,
          useFactory: () => instance(mockPomeloRepo),
        },
        {
          provide: LocationService,
          useFactory: () => instance(mockLocationService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(mockConsumerService),
        },
        {
          provide: PomeloClient,
          useFactory: () => instance(mockPomeloClient),
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

      const identification: Identification = {
        type: "CC",
        value: "123456789",
        id: "identification-id-123",
        consumerID: consumer.props.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        countryCode: "CO",
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

      when(mockLocationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn(locationDetails);
      when(mockPomeloClient.createUser(anyString(), anything())).thenResolve({
        id: pomeloUser.pomeloID,
        status: ClientUserStatus.ACTIVE,
      });

      when(mockPomeloClient.createCard(anyString(), anything())).thenResolve({
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

      when(mockPomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(mockPomeloRepo.createPomeloUser(anything())).thenResolve(pomeloUser);
      when(mockPomeloRepo.createPomeloCard(anything())).thenResolve(nobaCard);
      when(mockConsumerService.getAllIdentifications(consumer.props.id)).thenResolve([identification]);

      const createdCard = await pomeloService.createCard(consumer, NobaCardType.VIRTUAL);

      expect(createdCard).toEqual(nobaCard);

      verify(
        mockPomeloClient.createUser(
          consumer.props.id,
          deepEqual({
            name: consumer.props.firstName,
            surname: consumer.props.lastName,
            identification_type: identification.type,
            identification_value: identification.value,
            birthdate: consumer.props.dateOfBirth,
            gender: consumer.props.gender,
            email: consumer.props.email,
            phone: consumer.props.phone.replace("+57", ""),
            operation_country: locationDetails.alpha3ISOCode,
            nationality: locationDetails.alpha3ISOCode,
            legal_address: {
              street_name: consumer.props.address.streetLine1,
              street_number: " ",
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
        mockPomeloClient.createCard(
          String(CryptoJS.SHA256(`${pomeloUser.id}-${NobaCardType.VIRTUAL}`)),
          deepEqual({
            user_id: pomeloUser.pomeloID,
            card_type: NobaCardType.VIRTUAL,
            affinity_group_id: "fake-ag",
          }),
        ),
      ).once();

      verify(
        mockPomeloRepo.createPomeloUser(
          deepEqual({
            consumerID: consumer.props.id,
            pomeloUserID: pomeloUser.pomeloID,
          }),
        ),
      ).once();

      verify(
        mockPomeloRepo.createPomeloCard(
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

    it("should create new user record when user exists in Pomelo and issue a new card", async () => {
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

      const identification: Identification = {
        type: "CC",
        value: "123456789",
        id: "identification-id-123",
        consumerID: consumer.props.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        countryCode: "CO",
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

      when(mockLocationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn(locationDetails);
      when(mockPomeloClient.createUser(anyString(), anything())).thenReject(
        new ServiceException({
          message: "Already exists",
          errorCode: ServiceErrorCode.ALREADY_EXISTS,
        }),
      );

      when(mockPomeloClient.getUserByEmail(consumer.props.email)).thenResolve({
        id: pomeloUser.pomeloID,
        status: ClientUserStatus.ACTIVE,
      });

      when(mockPomeloClient.createCard(anyString(), anything())).thenResolve({
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

      when(mockPomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(mockPomeloRepo.createPomeloUser(anything())).thenResolve(pomeloUser);
      when(mockPomeloRepo.createPomeloCard(anything())).thenResolve(nobaCard);
      when(mockConsumerService.getAllIdentifications(consumer.props.id)).thenResolve([identification]);

      const createdCard = await pomeloService.createCard(consumer, NobaCardType.VIRTUAL);

      expect(createdCard).toEqual(nobaCard);

      verify(
        mockPomeloClient.createUser(
          consumer.props.id,
          deepEqual({
            name: consumer.props.firstName,
            surname: consumer.props.lastName,
            identification_type: identification.type,
            identification_value: identification.value,
            birthdate: consumer.props.dateOfBirth,
            gender: consumer.props.gender,
            email: consumer.props.email,
            phone: consumer.props.phone.replace("+57", ""),
            operation_country: locationDetails.alpha3ISOCode,
            nationality: locationDetails.alpha3ISOCode,
            legal_address: {
              street_name: consumer.props.address.streetLine1,
              street_number: " ",
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
        mockPomeloClient.createCard(
          String(CryptoJS.SHA256(`${pomeloUser.id}-${NobaCardType.VIRTUAL}`)),
          deepEqual({
            user_id: pomeloUser.pomeloID,
            card_type: NobaCardType.VIRTUAL,
            affinity_group_id: "fake-ag",
          }),
        ),
      ).once();

      verify(
        mockPomeloRepo.createPomeloUser(
          deepEqual({
            consumerID: consumer.props.id,
            pomeloUserID: pomeloUser.pomeloID,
          }),
        ),
      ).once();

      verify(
        mockPomeloRepo.createPomeloCard(
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

      when(mockLocationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn(locationDetails);

      when(mockPomeloClient.createCard(anyString(), anything())).thenResolve({
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

      when(mockPomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(pomeloUser);
      when(mockPomeloRepo.createPomeloCard(anything())).thenResolve(nobaCard);

      const createdCard = await pomeloService.createCard(consumer, NobaCardType.VIRTUAL);

      expect(createdCard).toEqual(nobaCard);

      verify(mockPomeloClient.createUser(anyString(), anything())).never();

      verify(
        mockPomeloClient.createCard(
          String(CryptoJS.SHA256(`${pomeloUser.id}-${NobaCardType.VIRTUAL}`)),
          deepEqual({
            user_id: pomeloUser.pomeloID,
            card_type: NobaCardType.VIRTUAL,
            affinity_group_id: "fake-ag",
          }),
        ),
      ).once();

      verify(
        mockPomeloRepo.createPomeloCard(
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

      when(mockPomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);

      when(mockLocationService.getLocationDetails("CO")).thenReturn(null);

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

      when(mockPomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(mockLocationService.getLocationDetails("CO")).thenReturn(locationDetails);

      await expect(async () => await pomeloService.createCard(consumer, NobaCardType.VIRTUAL)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException when creating user in Pomelo fails", async () => {
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

      const identification: Identification = {
        type: "CC",
        value: "123456789",
        id: "identification-id-123",
        consumerID: consumer.props.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        countryCode: "CO",
      };

      when(mockPomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(mockLocationService.getLocationDetails("CO")).thenReturn(locationDetails);
      when(mockPomeloClient.createUser(anyString(), anything())).thenReject(
        new ServiceException({
          message: "Error creating user in Pomelo",
          errorCode: ServiceErrorCode.UNKNOWN,
        }),
      );

      when(mockConsumerService.getAllIdentifications(consumer.props.id)).thenResolve([identification]);

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
      const identification: Identification = {
        type: "CC",
        value: "123456789",
        id: "identification-id-123",
        consumerID: consumer.props.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        countryCode: "CO",
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

      when(mockLocationService.getLocationDetails(consumer.props.address.countryCode)).thenReturn(locationDetails);
      when(mockPomeloClient.createUser(anyString(), anything())).thenResolve({
        id: pomeloUser.pomeloID,
        status: ClientUserStatus.ACTIVE,
      });

      when(mockPomeloClient.createCard(anyString(), anything())).thenReject(
        new ServiceException({
          message: "Pomelo User does not exist",
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        }),
      );

      when(mockPomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(mockPomeloRepo.createPomeloUser(anything())).thenResolve(pomeloUser);
      when(mockConsumerService.getAllIdentifications(consumer.props.id)).thenResolve([identification]);

      await expect(async () => await pomeloService.createCard(consumer, NobaCardType.VIRTUAL)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw 'ServiceException' if supported identification type does not exist", async () => {
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

      const identification: Identification = {
        type: "SSN",
        value: "123456789",
        id: "identification-id-123",
        consumerID: consumer.props.id,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        countryCode: "CO",
      };

      when(mockPomeloRepo.getPomeloUserByConsumerID(consumer.props.id)).thenResolve(null);
      when(mockLocationService.getLocationDetails("CO")).thenReturn(locationDetails);
      when(mockConsumerService.getAllIdentifications(consumer.props.id)).thenResolve([identification]);

      await expect(async () => await pomeloService.createCard(consumer, NobaCardType.VIRTUAL)).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("getWebViewToken", () => {
    it("should return a valid token", async () => {
      const pomeloCard: PomeloCard = {
        id: "fake-id-123",
        pomeloCardID: "pomelo-card-1234",
        pomeloUserID: "pomelo-user-1234",
        nobaCardID: "nobaCard-id",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      const nobaCard: NobaCard = {
        id: pomeloCard.nobaCardID,
        consumerID: "fake-consumer-id",
        type: NobaCardType.VIRTUAL,
        status: NobaCardStatus.ACTIVE,
        last4Digits: "1234",
        provider: CardProvider.POMELO,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      when(mockPomeloRepo.getPomeloCardByNobaCardID(pomeloCard.nobaCardID)).thenResolve(pomeloCard);

      when(mockPomeloClient.createUserToken(pomeloCard.pomeloUserID)).thenResolve("fake-token");

      const response = await pomeloService.getWebViewToken(nobaCard);

      expect(response).toStrictEqual({
        accessToken: "fake-token",
        providerCardID: pomeloCard.pomeloCardID,
        provider: "POMELO",
      });
    });

    it("should throw 'ServiceException' when pomelo card does not exist", async () => {
      const nobaCard: NobaCard = {
        id: "nobaCard-id",
        consumerID: "fake-consumer-id",
        type: NobaCardType.VIRTUAL,
        status: NobaCardStatus.ACTIVE,
        last4Digits: "1234",
        provider: CardProvider.POMELO,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
      };

      when(mockPomeloRepo.getPomeloCardByNobaCardID(nobaCard.id)).thenResolve(null);

      await expect(async () => await pomeloService.getWebViewToken(nobaCard)).rejects.toThrow(ServiceException);
    });
  });
});
