import { differenceInMinutes, format, formatISO, parseISO } from 'date-fns'; 
import * as Joi from 'joi';

export const validISODateTimeStringFilter: Joi.CustomValidator = (value, helpers) => {
    //This is same as Joi.string().isoDate() but this doesn't allow invalid dates, Joi's isoDate is just a regex check
    Joi.attempt(value,Joi.string().isoDate().required());

    const date = parseISO(value);
    
    if(!isValidDate(date)){
        return helpers.error('any.invalid');
    }
    return value;
};

export const validISOFormattedDateAloneFilter: Joi.CustomValidator = (value,helpers) => {//given value should be ISO formatted date "2021-02-05"
    const date = parseISO(value);
    if(dateToIsoFormattedDateAloneString(date)!==value) {
        return helpers.error('any.invalid');
    }
    return value; 
}

export function isValidDate(date: Date) {
   return date instanceof Date && !isNaN(date.getTime())
}


export function dateToIsoFormattedDateAloneString(date: Date) {//for new Date(2021,4,1) will return "2021-05-01" irrespective of system timezone (note javascript Date month start with 0 index)
    const isoStr = formatISO(date, {representation: "date"} );
    return isoStr; 
}



export function dayNameThreeLetter(date: Date) {
    return format(date, "iii"); //new Date(2021,4,30, 5,30) will return "Sun"
}

export function durationMinutes(startTimeZ: string, endTimeZ: string) {
    return differenceInMinutes(new Date(endTimeZ), new Date(startTimeZ));
}
