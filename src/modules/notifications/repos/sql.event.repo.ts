import { Inject } from "@nestjs/common";
import { PrismaService } from "../../../infraproviders/PrismaService";
import {
  EventCreateRequest,
  Event,
  EventUpdateRequest,
  validateEventCreateRequest,
  convertToDomainEvent,
  validateEvent,
  EventModel,
  validateEventUpdateRequest,
} from "../domain/Event";
import {
  EventTemplateCreateRequest,
  EventTemplateUpdateRequest,
  validateEventTemplateCreateRequest,
  validateEventTemplateUpdateRequest,
} from "../domain/EventTemplates";
import { EventRepo } from "./event.repo";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Prisma, EventTemplate as PrismaEventTemplateModel } from "@prisma/client";
import { Logger } from "winston";
import { RepoErrorCode, RepoException } from "../../../core/exception/repo.exception";
import { AlertService } from "../../../modules/common/alerts/alert.service";

export class SQLEventRepo implements EventRepo {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly alertService: AlertService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createEvent(event: EventCreateRequest): Promise<Event> {
    validateEventCreateRequest(event);

    let savedEvent = null;

    try {
      const eventCreateInput: Prisma.EventCreateInput = {
        name: event.name,
        handlers: event.handlers,
      };

      const returnedEvent: EventModel = await this.prismaService.event.create({
        data: eventCreateInput,
        include: {
          templates: true,
        },
      });

      savedEvent = convertToDomainEvent(returnedEvent);
    } catch (e) {
      this.alertService.raiseError(`Failed to create event: ${e}`);
      throw new RepoException({
        message: "Failed to create event",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }

    try {
      validateEvent(savedEvent);
      return savedEvent;
    } catch (e) {
      this.alertService.raiseError(`Failed to validate event: ${e}`);
      throw new RepoException({
        message: "Failed to validate event",
        errorCode: RepoErrorCode.INVALID_DATABASE_RECORD,
      });
    }
  }

  async getEventByIDOrName(idOrName: string): Promise<Event> {
    try {
      const event: EventModel = await this.prismaService.event.findFirst({
        where: {
          OR: [
            {
              id: idOrName,
            },
            {
              name: idOrName,
            },
          ],
        },
        include: {
          templates: true,
        },
      });

      return convertToDomainEvent(event);
    } catch (e) {
      this.alertService.raiseError(`Failed to get event by id: ${e}`);
      throw new RepoException({
        message: "Failed to get event by id",
        errorCode: RepoErrorCode.NOT_FOUND,
      });
    }
  }

  async updateEvent(id: string, updateRequest: EventUpdateRequest): Promise<Event> {
    validateEventUpdateRequest(updateRequest);

    try {
      const eventUpdateInput: Prisma.EventUpdateInput = {
        handlers: updateRequest.handlers,
      };

      const updatedEvent: EventModel = await this.prismaService.event.update({
        where: {
          id: id,
        },
        data: eventUpdateInput,
        include: {
          templates: true,
        },
      });

      return convertToDomainEvent(updatedEvent);
    } catch (e) {
      this.alertService.raiseError(`Failed to update event: ${e}`);
      throw new RepoException({
        message: "Failed to update event",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }

  async createEventTemplate(eventTemplate: EventTemplateCreateRequest): Promise<Event> {
    validateEventTemplateCreateRequest(eventTemplate);

    try {
      const eventTemplateCreateInput: Prisma.EventTemplateCreateInput = {
        ...(eventTemplate.templateBody && { templateBody: eventTemplate.templateBody }),
        ...(eventTemplate.externalKey && { externalKey: eventTemplate.externalKey }),
        ...(eventTemplate.templateTitle && { templateTitle: eventTemplate.templateTitle }),
        type: eventTemplate.type,
        locale: eventTemplate.locale,
        event: {
          connect: {
            id: eventTemplate.eventID,
          },
        },
      };

      await this.prismaService.eventTemplate.create({
        data: eventTemplateCreateInput,
      });

      return this.getEventByIDOrName(eventTemplate.eventID);
    } catch (e) {
      this.alertService.raiseError(`Failed to create event template: ${e}`);
      throw new RepoException({
        message: "Failed to create event template",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }

  async updateEventTemplate(id: string, updateRequest: EventTemplateUpdateRequest): Promise<Event> {
    validateEventTemplateUpdateRequest(updateRequest);
    try {
      const eventTemplateUpdateInput: Prisma.EventTemplateUpdateInput = {
        ...(updateRequest.templateBody && { templateBody: updateRequest.templateBody, externalKey: null }),
        ...(updateRequest.templateTitle && { templateTitle: updateRequest.templateTitle }),
        ...(updateRequest.externalKey && { externalKey: updateRequest.externalKey, templateBody: null }),
        ...(updateRequest.type && { type: updateRequest.type }),
        ...(updateRequest.locale && { locale: updateRequest.locale }),
      };

      const eventTemplate: PrismaEventTemplateModel = await this.prismaService.eventTemplate.update({
        where: {
          id: id,
        },
        data: eventTemplateUpdateInput,
      });

      return this.getEventByIDOrName(eventTemplate.eventID);
    } catch (e) {
      this.alertService.raiseError(`Failed to update event template: ${e}`);
      throw new RepoException({
        message: "Failed to update event template",
        errorCode: RepoErrorCode.DATABASE_INTERNAL_ERROR,
      });
    }
  }
}
