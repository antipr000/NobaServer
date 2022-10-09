import {
  NotificationEventHandler,
  NotificationEventType,
} from "../../../modules/notifications/domain/NotificationTypes";

export type NotificationConfiguration = {
  notificationEventType: NotificationEventType;
  notificationEventHandler: NotificationEventHandler[];
};
