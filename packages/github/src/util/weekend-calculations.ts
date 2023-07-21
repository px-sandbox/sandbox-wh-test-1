import moment from 'moment';

export function getWeekenedCount(startDate: string, endDate: string) {
  const momentStartDate = moment(startDate, 'YYYY-MM-DD');
  const momentEndDate = moment(endDate, 'YYYY-MM-DD');

  const diff = momentEndDate.diff(momentStartDate, 'd') + 1;

  const weeksCount = Math.floor(diff / 7);
  const remainingDays = diff % 7;
  const weekendsFromWeeks = weeksCount * 2;
  const weekendsFromRemainingDays = getWeekendsFromRemainingDays(momentStartDate, remainingDays);

  return weekendsFromWeeks + weekendsFromRemainingDays;
}
export function getWeekDaysCount(startDate: string, endDate: string) {
  const momentStartDate = moment(startDate, 'YYYY-MM-DD');
  const momentEndDate = moment(endDate, 'YYYY-MM-DD');

  const diff = momentEndDate.diff(momentStartDate, 'd') + 1;

  const weeksCount = Math.floor(diff / 7);
  const remainingDays = diff % 7;
  const weekendsFromWeeks = weeksCount * 2;
  const weekendsFromRemainingDays = getWeekendsFromRemainingDays(momentStartDate, remainingDays);

  return diff - (weekendsFromWeeks + weekendsFromRemainingDays);
}

export function getWeekendsFromRemainingDays(startDate: moment.Moment, remainingDays: number) {
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
