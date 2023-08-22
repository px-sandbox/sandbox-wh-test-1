import moment from 'moment';
import { esbDateHistogramInterval } from '../constant/config';

export function calculateGraphAvg(interval: string, data: any): number {
  const prTimeInSeconds = data.pr_time_in_seconds.value;

  if (prTimeInSeconds === 0) {
    return 0;
  }

  switch (interval) {
    case esbDateHistogramInterval.month:
      const selectedDate = moment(data.key_as_string);
      const totalDays = selectedDate.daysInMonth();
      return prTimeInSeconds / totalDays;

    case esbDateHistogramInterval.day:
      return prTimeInSeconds;

    case esbDateHistogramInterval['2d']:
      return prTimeInSeconds / 2;

    case esbDateHistogramInterval['3d']:
      return prTimeInSeconds / 3;

    case esbDateHistogramInterval.year:
      const selectedDateYear = moment(data.key_as_string, 'YYYY-MM-DD');
      const totalDaysYear = selectedDateYear.clone().endOf('year').dayOfYear();
      return prTimeInSeconds / totalDaysYear;

    default:
      return 0;
  }
}
