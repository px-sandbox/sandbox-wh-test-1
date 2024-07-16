import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import moment from 'moment';
import { getIssueStatusForReopenRate } from './issue-status';

export async function initializeMapping(orgId: string): Promise<HitBody> {
  try {
    const data = await getIssueStatusForReopenRate(orgId, { requestId: '', resourceId: '' });
    return data;
  } catch (error) {
    logger.error({ message: 'Error initializing mapping:', error });
    throw error;
  }
}

export function calculateTimeDifference(
  endTime: string | undefined | number,
  startTime: string | undefined | number
): number {
  if (!startTime || !endTime) return 0;
  const startTimeMoment = moment(startTime);
  const endTimeMoment = moment(endTime);
  const time = endTimeMoment.diff(startTimeMoment, 'milliseconds');
  return time;
}
