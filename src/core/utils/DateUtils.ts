import { differenceInMinutes, format, formatISO, parseISO } from "date-fns";
import * as Joi from "joi";

export const validISODateTimeStringFilter: Joi.CustomValidator = (value, helpers) => {
  //This is same as Joi.string().isoDate() but this doesn't allow invalid dates, Joi's isoDate is just a regex check
  Joi.attempt(value, Joi.string().isoDate().required());

  const date = parseISO(value);

  if (!isValidDate(date)) {
    return helpers.error("any.invalid");
  }
  return value;
};

export const validISOFormattedDateAloneFilter: Joi.CustomValidator = (value, helpers) => {
  //given value should be ISO formatted date "2021-02-05"
  const date = parseISO(value);
  if (dateToIsoFormattedDateAloneString(date) !== value) {
    return helpers.error("any.invalid");
  }
  return value;
};

export function isValidDate(date: Date) {
  return date instanceof Date && !isNaN(date.getTime());
}

export function dateToIsoFormattedDateAloneString(date: Date) {
  //for new Date(2021,4,1) will return "2021-05-01" irrespective of system timezone (note javascript Date month start with 0 index)
  const isoStr = formatISO(date, { representation: "date" });
  return isoStr;
}

export function dayNameThreeLetter(date: Date) {
  return format(date, "iii"); //new Date(2021,4,30, 5,30) will return "Sun"
}

export function durationMinutes(startTimeZ: string, endTimeZ: string) {
  return differenceInMinutes(new Date(endTimeZ), new Date(startTimeZ));
}

/**
 * Returns the week number for this date.
 * https://stackoverflow.com/questions/9045868/javascript-date-getweek
 * @param  {Date} date
 * @param  {number} [dowOffset] — The day of week the week "starts" on for your locale - it can be from `0` to `6`. By default `dowOffset` is `0` (USA, Sunday). If `dowOffset` is 1 (Monday), the week returned is the ISO 8601 week number.
 * @return {number}
 */
export function getWeek(date: Date, dowOffset = 0) {
  /*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */
  const newYear = new Date(date.getFullYear(), 0, 1);
  let day = newYear.getDay() - dowOffset; //the day of week the year begins on
  day = day >= 0 ? day : day + 7;
  const daynum =
    Math.floor(
      (date.getTime() - newYear.getTime() - (date.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) /
        86400000,
    ) + 1;
  //if the year starts before the middle of a week
  if (day < 4) {
    const weeknum = Math.floor((daynum + day - 1) / 7) + 1;
    if (weeknum > 52) {
      const nYear = new Date(date.getFullYear() + 1, 0, 1);
      let nday = nYear.getDay() - dowOffset;
      nday = nday >= 0 ? nday : nday + 7;
      /*if the next year starts before the middle of
          the week, it is week #1 of that year*/
      return nday < 4 ? 1 : 53;
    }
    return weeknum;
  } else {
    return Math.floor((daynum + day - 1) / 7);
  }
}
