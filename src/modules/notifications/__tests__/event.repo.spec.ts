import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { EventRepo } from "../repos/event.repo";
import { SQLEventRepo } from "../repos/sql.event.repo";
import { EventCreateRequest, EventUpdateRequest } from "../domain/Event";
import { uuid } from "uuidv4";
import { EventHandlers } from "../domain/EventHandlers";
import { RepoException } from "../../../core/exception/repo.exception";
import { EventTemplateCreateRequest, EventTemplateUpdateRequest } from "../domain/EventTemplates";

describe("EventRepoTests", () => {
  jest.setTimeout(20000);

  let eventRepo: EventRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SQLEventRepo],
    }).compile();

    eventRepo = app.get<EventRepo>(SQLEventRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.event.deleteMany();
    app.close();
  });

  describe("createEvent", () => {
    it("should create Event if parameters are correct", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      expect(event).toBeDefined();
      expect(event.name).toEqual(eventCreateRequest.name);
      expect(event.handlers).toStrictEqual(eventCreateRequest.handlers);
    });

    it("should throw RepoException if 'name' is duplicate", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      await eventRepo.createEvent(eventCreateRequest);

      await expect(eventRepo.createEvent(eventCreateRequest)).rejects.toThrow(RepoException);
    });

    it("should throw error if 'name' is empty", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: "",
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      await expect(eventRepo.createEvent(eventCreateRequest)).rejects.toThrow(Error);
    });

    it("should throw error if 'handlers' is empty", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [],
      };

      await expect(eventRepo.createEvent(eventCreateRequest)).rejects.toThrow(Error);
    });

    it("should throw Error if handler is not valid EventType", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: ["INVALID_HANDLER" as EventHandlers],
      };

      await expect(eventRepo.createEvent(eventCreateRequest)).rejects.toThrow(Error);
    });
  });

  describe("getEventByID", () => {
    it("should return Event if Event exists", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      const eventByID = await eventRepo.getEventByID(event.id);

      expect(eventByID).toBeDefined();
      expect(eventByID.id).toEqual(event.id);
      expect(eventByID.name).toEqual(event.name);
      expect(eventByID.handlers).toStrictEqual(event.handlers);
    });

    it("should throw RepoException if Event does not exist", async () => {
      await expect(eventRepo.getEventByID("INVALID_ID")).rejects.toThrow(RepoException);
    });
  });

  describe("getEventByName", () => {
    it("should return Event if Event exists", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      const eventByName = await eventRepo.getEventByName(event.name);

      expect(eventByName).toBeDefined();
      expect(eventByName.id).toEqual(event.id);
      expect(eventByName.name).toEqual(event.name);
      expect(eventByName.handlers).toStrictEqual(event.handlers);
    });

    it("should throw RepoException if Event does not exist", async () => {
      await expect(eventRepo.getEventByName("INVALID_NAME")).rejects.toThrow(RepoException);
    });
  });

  describe("updateEvent", () => {
    it("should update Event if parameters are correct", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      const eventUpdateRequest: EventUpdateRequest = {
        handlers: [EventHandlers.EMAIL],
      };

      const updatedEvent = await eventRepo.updateEvent(event.id, eventUpdateRequest);

      expect(updatedEvent).toBeDefined();
      expect(updatedEvent.id).toEqual(event.id);
      expect(updatedEvent.handlers).toStrictEqual(eventUpdateRequest.handlers);
    });

    it("should throw RepoException if Event does not exist", async () => {
      const eventUpdateRequest: EventUpdateRequest = {
        handlers: [EventHandlers.EMAIL],
      };

      await expect(eventRepo.updateEvent("INVALID_ID", eventUpdateRequest)).rejects.toThrow(RepoException);
    });

    it("should throw Error if handler is invalid", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      const eventUpdateRequest: EventUpdateRequest = {
        handlers: ["INVALID_HANDLER" as EventHandlers],
      };

      await expect(eventRepo.updateEvent(event.id, eventUpdateRequest)).rejects.toThrow(Error);
    });
  });

  describe("createEventTemplate", () => {
    it("should create event template and add it to event if parameters are correct", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      const eventTemplateCreateRequest: EventTemplateCreateRequest = {
        eventID: event.id,
        type: EventHandlers.EMAIL,
        locale: "en",
        externalKey: "sg-1234",
      };

      const updatedEvent = await eventRepo.createEventTemplate(eventTemplateCreateRequest);

      expect(updatedEvent).toBeDefined();
      expect(updatedEvent.id).toBe(event.id);
      expect(updatedEvent.templates).toHaveLength(1);
      expect(updatedEvent.templates[0].type).toBe(eventTemplateCreateRequest.type);
      expect(updatedEvent.templates[0].locale).toBe(eventTemplateCreateRequest.locale);
      expect(updatedEvent.templates[0].externalKey).toBe(eventTemplateCreateRequest.externalKey);
    });

    it("should throw RepoException if event does not exist", async () => {
      const eventTemplateCreateRequest: EventTemplateCreateRequest = {
        eventID: "INVALID_ID",
        type: EventHandlers.EMAIL,
        locale: "en",
        externalKey: "sg-1234",
      };

      await expect(eventRepo.createEventTemplate(eventTemplateCreateRequest)).rejects.toThrow(RepoException);
    });

    it("should throw Error if type is invalid", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      const eventTemplateCreateRequest: EventTemplateCreateRequest = {
        eventID: event.id,
        type: "INVALID_TYPE" as EventHandlers,
        locale: "en",
        externalKey: "sg-1234",
      };

      await expect(eventRepo.createEventTemplate(eventTemplateCreateRequest)).rejects.toThrow(Error);
    });

    it("should throw Error if locale is undefined", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      const eventTemplateCreateRequest: EventTemplateCreateRequest = {
        eventID: event.id,
        type: EventHandlers.EMAIL,
        locale: undefined,
        externalKey: "sg-1234",
      };

      await expect(eventRepo.createEventTemplate(eventTemplateCreateRequest)).rejects.toThrow(Error);
    });
  });

  describe("updateEventTemplate", () => {
    it("should update event template and add it to event if parameters are correct", async () => {
      const eventCreateRequest: EventCreateRequest = {
        name: uuid(),
        handlers: [EventHandlers.EMAIL, EventHandlers.PUSH],
      };

      const event = await eventRepo.createEvent(eventCreateRequest);

      const eventTemplateCreateRequest: EventTemplateCreateRequest = {
        eventID: event.id,
        type: EventHandlers.EMAIL,
        locale: "en",
        externalKey: "sg-1234",
      };

      const eventWithTemplate = await eventRepo.createEventTemplate(eventTemplateCreateRequest);

      const eventTemplateUpdateRequest: EventTemplateUpdateRequest = {
        type: EventHandlers.PUSH,
        locale: "en",
        templateBody: "template body",
      };

      const updatedEvent = await eventRepo.updateEventTemplate(
        eventWithTemplate.templates[0].id,
        eventTemplateUpdateRequest,
      );

      expect(updatedEvent.id).toBe(event.id);
      expect(updatedEvent.templates).toHaveLength(1);
      expect(updatedEvent.templates[0].type).toBe(eventTemplateUpdateRequest.type);
      expect(updatedEvent.templates[0].locale).toBe(eventTemplateUpdateRequest.locale);
      expect(updatedEvent.templates[0].templateBody).toBe(eventTemplateUpdateRequest.templateBody);
      expect(updatedEvent.templates[0].externalKey).toBe(null);
      expect(updatedEvent.templates[0].id).toBe(eventWithTemplate.templates[0].id);
    });

    it("should throw RepoException if template with id does not exist", async () => {
      const eventTemplateUpdateRequest: EventTemplateUpdateRequest = {
        type: EventHandlers.PUSH,
        locale: "en",
        templateBody: "template body",
      };

      await expect(eventRepo.updateEventTemplate("INVALID_ID", eventTemplateUpdateRequest)).rejects.toThrow(
        RepoException,
      );
    });
  });
});
