/* eslint-disable quotes */
import { NotificationEventType } from "./event.data";

export type ReminderScheduleMap = {
  [key: string]: {
    query: (eventID: string) => string;
    groupKey: string;
  };
};

export const reminderScheduleMap: ReminderScheduleMap = {
  [NotificationEventType.REQUEST_EMPLOYER_REMINDER_EVENT]: {
    // 3 days post sign-up if no employer
    groupKey: "reminder_group_1",
    query: eventID =>
      'select * from "Consumer" where "createdTimestamp" <= NOW() - INTERVAL \'3 days\' and id not in ' +
      `(select DISTINCT("consumerID") from "Employee" UNION select DISTINCT("consumerID") from "ReminderHistory" where "eventID" = '${eventID}');`,
  },
  [NotificationEventType.REFER_A_FRIEND_REMINDER_EVENT]: {
    // 5 days post sign-up if no referrals
    groupKey: "reminder_group_2",
    query: eventID =>
      'select * from "Consumer" where "createdTimestamp" <= NOW() - INTERVAL \'5 days\' and id not in ' +
      `(select DISTINCT("referredByID") from "Consumer" UNION select DISTINCT("consumerID") from "ReminderHistory" where "eventID" = '${eventID}');`,
  },
  [NotificationEventType.DOLLAR_VALUE_DROP_REMINDER_EVENT]: {
    // Anytime the value of the peso goes below 4,500 and do not repeat within 1 day
    groupKey: "reminder_group_3",
    query: eventID =>
      'select * from "Consumer" where NOT EXISTS (select 1 from "ExchangeRate" where "bankRate" < 4500 and "numeratorCurrency" = \'USD\' and "denominatorCurrency" = \'COP\')' +
      `AND id not in (select DISTINCT("consumerID") from "ReminderHistory" where "eventID" = '${eventID}' AND "updatedTimestamp" <= NOW() - INTERVAL \'1 day\');`,
  },
  [NotificationEventType.SEND_MONEY_REMINDER_EVENT]: {
    // Send on 1st day of month to all Consumers
    groupKey: "reminder_group_4",
    query: eventID =>
      "SELECT * from \"Consumer\" WHERE DATE_PART('day', CURRENT_DATE) = 1 AND id not in " +
      `(select DISTINCT("consumerID") from "ReminderHistory" where "eventID" = '${eventID}' AND "updatedTimestamp" <= NOW() - INTERVAL \'27 days\');`,
  },
};
