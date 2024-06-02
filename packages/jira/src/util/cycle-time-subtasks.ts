import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
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
