import { GraphAvgCal } from 'abstraction/github/type';
import moment from 'moment';
import { esbDateHistogramInterval } from 'src/constant/config';

export function calculateGraphAvg(interval: string, data: GraphAvgCal): number {
  const prTimeInSeconds = data.pr_time_in_seconds.value;

  if (prTimeInSeconds === 0) {
    return 0;
  }

  switch (interval) {
    case esbDateHistogramInterval.month:
    case esbDateHistogramInterval.year:
      const selectedDate = moment(data.key_as_string);
      const totalDays =
        interval === esbDateHistogramInterval.month
          ? selectedDate.daysInMonth()
          : interval === esbDateHistogramInterval.year
          ? selectedDate.clone().endOf('year').dayOfYear()
          : 0;
      return prTimeInSeconds / totalDays;

    case esbDateHistogramInterval.day:
      return prTimeInSeconds;

    case esbDateHistogramInterval['2d']:
      return prTimeInSeconds / 2;

    case esbDateHistogramInterval['3d']:
      return prTimeInSeconds / 3;

    default:
      return 0;
  }
}
