import { Event, EventCreateRequest, EventUpdateRequest } from "../domain/Event";
import { EventTemplateCreateRequest, EventTemplateUpdateRequest } from "../domain/EventTemplates";

export interface EventRepo {
  createEvent(event: EventCreateRequest): Promise<Event>;
  getEventByID(id: string): Promise<Event>;
  getEventByName(name: string): Promise<Event>;
  updateEvent(id: string, updateRequest: EventUpdateRequest): Promise<Event>;
  createEventTemplate(eventTemplate: EventTemplateCreateRequest): Promise<Event>;
  updateEventTemplate(id: string, updateRequest: EventTemplateUpdateRequest): Promise<Event>;
}
