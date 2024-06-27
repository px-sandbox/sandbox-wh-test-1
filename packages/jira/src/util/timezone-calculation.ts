import moment from 'moment';
import { logger } from 'core';

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
      logger.info({
        message: `No case found for offset.radical : ${offset.radical} in getTimeWithOffset`,
      });
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

export function getWeekendsFromRemainingDays(
  startDate: moment.Moment,
  remainingDays: number
): number {
  if (remainingDays === 0) {
    return 0;
  }
  const startDay = startDate.day();

  let weekends = 0;

  if (startDay === 0) {
    // Sunday
    weekends = 1;
  } else {
    // Other than Sunday
    const temp = remainingDays - (6 - startDay);
    if (temp < 0) {
      weekends = 0;
    } else if (temp > 2) {
      weekends = 2;
    } else {
      weekends = temp;
    }
  }

  return weekends;
}
export function getWeekenedCount(startDate: string, endDate: string): number {
  const momentStartDate = moment(startDate, 'YYYY-MM-DD');
  const momentEndDate = moment(endDate, 'YYYY-MM-DD');

  const diff = momentEndDate.diff(momentStartDate, 'd') + 1;

  const weeksCount = Math.floor(diff / 7);
  const remainingDays = diff % 7;
  const weekendsFromWeeks = weeksCount * 2;
  const weekendsFromRemainingDays = getWeekendsFromRemainingDays(momentStartDate, remainingDays);

  return weekendsFromWeeks + weekendsFromRemainingDays;
}
export function getWeekDaysCount(startDate: string, endDate: string): number {
  const momentStartDate = moment(startDate, 'YYYY-MM-DD');
  const momentEndDate = moment(endDate, 'YYYY-MM-DD');
  const diff = momentEndDate.diff(momentStartDate, 'd') + 1;

  return diff - getWeekenedCount(startDate, endDate);
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

  const newStartDate = getTimeWithOffset(startDate, offsetTime);
  const newEndDate = getTimeWithOffset(endDate, offsetTime);

  const totalDays = getDays(newEndDate, newStartDate);

  const weekends = getWeekenedCount(
    newEndDate.format('YYYY-MM-DD'),
    newStartDate.format('YYYY-MM-DD')
  );

  const totalTime = newStartDate.diff(newEndDate, 'milliseconds');
  const offhoursTime = (totalDays - weekends) * 15 * 60 * 60 * 1000;
  const weekendTime = weekends * 24 * 60 * 60 * 1000;

  return totalTime - offhoursTime - weekendTime;
}
