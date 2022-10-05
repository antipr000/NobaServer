import {
  NotificationEventHandlers,
  NotificationEventTypes,
} from "../../../modules/notifications/domain/NotificationTypes";

export type NotificationConfiguration = {
  notificationEventType: NotificationEventTypes;
  notificationEventHandler: NotificationEventHandlers[];
};
