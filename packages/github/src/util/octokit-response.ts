import { OctokitResponse } from '@octokit/types';
import { HttpStatusCode, logger } from 'core';

export function getOctokitResp<T>(octokitResp: OctokitResponse<T>): T {
  if (octokitResp.status === HttpStatusCode[200]) {
    return octokitResp.data;
  }
  logger.error({ message: 'OCTOKIT_RESPONSE_ERROR', data: octokitResp });
  throw octokitResp;
}
