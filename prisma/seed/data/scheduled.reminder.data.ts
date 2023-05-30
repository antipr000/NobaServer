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
      'SELECT C.* FROM "Consumer" C LEFT JOIN ' +
      '(SELECT DISTINCT "consumerID" as cid FROM "Employee" UNION ' +
      `SELECT DISTINCT "consumerID" as cid FROM "ReminderHistory" WHERE "eventID" = '${eventID}') ` +
      "EH ON C.id = EH.cid WHERE C.\"createdTimestamp\" <= NOW() - INTERVAL '3 days' AND EH.cid IS NULL;",
  },
  [NotificationEventType.REFER_A_FRIEND_REMINDER_EVENT]: {
    // 5 days post sign-up if no referrals
    groupKey: "reminder_group_2",
    query: eventID =>
      'SELECT C.* FROM "Consumer" C LEFT JOIN ' +
      '(SELECT DISTINCT "referredByID" as cid FROM "Consumer" ' +
      `UNION SELECT DISTINCT "consumerID" as cid FROM "ReminderHistory" WHERE "eventID" = '${eventID}') R ON C.id = R.cid ` +
      "WHERE C.\"createdTimestamp\" <= NOW() - INTERVAL '5 days' AND R.cid IS NULL;",
  },
  [NotificationEventType.DOLLAR_VALUE_DROP_REMINDER_EVENT]: {
    // Anytime the value of the peso goes below 4,500 and do not repeat within 1 day
    groupKey: "reminder_group_3",
    query: eventID =>
      'SELECT C.* FROM "Consumer" C LEFT JOIN ' +
      `(SELECT DISTINCT "consumerID" FROM "ReminderHistory" WHERE "eventID" = '${eventID}' ` +
      'AND "lastSentTimestamp" <= NOW() - INTERVAL \'1 day\') RH ON C.id = RH."consumerID" WHERE RH."consumerID" is NULL ' +
      'AND EXISTS (SELECT 1 from "ExchangeRate" where "bankRate" < 4500 and "numeratorCurrency" = \'USD\' and "denominatorCurrency" = \'COP\' ' +
      'AND "createdTimestamp" = (SELECT MAX("createdTimestamp") from "ExchangeRate"));',
  },
  [NotificationEventType.SEND_MONEY_REMINDER_EVENT]: {
    // Send on 1st day of month to all Consumers
    groupKey: "reminder_group_4",
    query: eventID =>
      'SELECT C.* FROM "Consumer" C LEFT JOIN ' +
      `(SELECT DISTINCT \"consumerID\"
        FROM "ReminderHistory"
        WHERE "eventID" = '${eventID}'
          AND "lastSentTimestamp" <= NOW() - INTERVAL '27 days'
      ) RH ON C."id" = RH."consumerID"
      WHERE RH."consumerID" IS NULL;`,
  },
  [NotificationEventType.DEPOSIT_FUNDS_REMINDER_EVENT]: {
    groupKey: "reminder_group_1",
    query: eventID =>
      'SELECT * FROM "Consumer" c JOIN "Circle" cir ON c.id = cir.consumerID' +
      `LEFT JOIN "ReminderHistory" rh ON c.id = rh.consumerID AND rh.eventID = ${eventID}` +
      "WHERE c.createdTimestamp <= NOW() - INTERVAL '24 hours'" +
      "cir.balance IS NOT NULL AND cir.balance = 0" +
      "AND rh.id IS NULL;",
  },
};
