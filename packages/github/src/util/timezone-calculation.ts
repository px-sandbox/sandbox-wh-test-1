// import { prices, priceHH } from "./data";
import moment from 'moment';
import { getWeekenedCount } from './weekend-calculations';

type Offset = {
  radical: '+' | '-';
  hours: number;
  minutes: number;
};

function getOffsetTime(offset: string): Offset {
  const radical = offset.at(0) as '+' | '-';
  const hours = parseInt(offset.substr(1, 2), 10);
  const minutes = parseInt(offset.substr(4, 2), 10);

  return {
    radical,
    hours,
    minutes,
  };
}

function getTimeWithOffset(date: moment.Moment, offset: Offset): moment.Moment {
  switch (offset.radical) {
    case '-':
      date.subtract(offset.hours, 'hours').subtract(offset.minutes, 'minutes');
      break;
    case '+':
      date.add(offset.hours, 'hours').add(offset.minutes, 'minutes');
      break;
    default:
      // Handle the default case here
      break;
  }

  return date;
}

function regulariseDate(date: moment.Moment): moment.Moment {
  if (date.day() === 6) {
    // Saturday
    return moment(date).add(2, 'd').hour(9).minute(30).second(0).millisecond(0);
  }
  if (date.day() === 0) {
    // Sunday
    return moment(date).add(1, 'd').hour(9).minute(30).second(0).millisecond(0);
  }
  const minBoundary = moment(date).hour(9).minute(30).second(0).millisecond(0);
  const maxBoundary = moment(date).hour(18).minute(30).second(0).millisecond(0);
  if (date.isBetween(minBoundary, maxBoundary)) {
    return date;
  }
  if (minBoundary.isSameOrAfter(date)) {
    return minBoundary;
  }
  return maxBoundary;
}

function getDays(startDate: moment.Moment, endDate: moment.Moment): number {
  return moment(endDate.format('YYYY-MM-DD'), 'YYYY-MM-DD').diff(
    moment(startDate.format('YYYY-MM-DD'), 'YYYY-MM-DD'),
    'd'
  );
}

/**
 *
 * @param startDate PR create date UTC
 * @param endDate PR reviewed date UTC
 * @param offset Time offset of the author: +05:30, +01:00
 * @returns number that represents time  in seconds
 */

export function getWorkingTime(
  startDate: moment.Moment,
  endDate: moment.Moment,
  offset: string
): number {
  const offsetTime = getOffsetTime(offset);

  const newStartDate = regulariseDate(getTimeWithOffset(startDate, offsetTime));

  const newEndDate = regulariseDate(getTimeWithOffset(endDate, offsetTime));

  const totalDays = getDays(newStartDate, newEndDate);

  const weekends = getWeekenedCount(
    newStartDate.format('YYYY-MM-DD'),
    newEndDate.format('YYYY-MM-DD')
  );

  const totalTime = newEndDate.diff(newStartDate, 'seconds');
  const offhoursTime = (totalDays - weekends) * 15 * 60 * 60;
  const weekendTime = weekends * 24 * 60 * 60;

  return totalTime - offhoursTime - weekendTime;
}
