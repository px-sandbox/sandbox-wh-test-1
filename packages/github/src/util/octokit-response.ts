import { OctokitResponse } from '@octokit/types';
import { HttpStatusCode, logger } from 'core';

export function getOctokitResp(octokitResp: OctokitResponse<unknown>): object {
  if (octokitResp.status === HttpStatusCode[200]) {
    return octokitResp.data as object;
  }
  logger.error('OCTOKIT_RESPONSE_ERROR', { octokitResp });
  throw octokitResp;
}
