import { Other } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { transpileSchema } from '@middy/validator/transpile';
import { calculateCycleTime, fetchSprintOrVersionIds } from '../../matrics/cycle-time/overall';
import { CycleTimeOverallValidator } from '../validations';

/**
 * Fetches the overall cycle time for a given project within a specified date range.
 *
 * @param reqCtx - The request context.
 * @param projectId - The ID of the project.
 * @param startDate - The start date of the date range.
 * @param endDate - The end date of the date range.
 * @param orgId - The ID of the organization.
 * @returns A promise that resolves to the overall cycle time as a number.
 */
async function fetchOverallCycleTime(
  reqCtx: Other.Type.RequestCtx,
  projectId: string,
  orgId: string,
  sprintIds?: string[],
  versionIds?: string[]
): Promise<number> {
  const ids = await fetchSprintOrVersionIds(projectId, orgId, reqCtx, sprintIds, versionIds);
  return calculateCycleTime(orgId, ids, { isSprint: (sprintIds && sprintIds.length > 0) ?? false });
}

export const cycleTimeOverall = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  const sprintIds: string[] | undefined = event.queryStringParameters?.sprintIds?.split(',') || [];
  const versionIds: string[] | undefined =
    event.queryStringParameters?.versionIds?.split(',') || [];
  const orgId = event.queryStringParameters?.orgId ?? '';
  const projectId = event.queryStringParameters?.projectId ?? '';

  const response = await fetchOverallCycleTime(
    { requestId, resourceId: projectId },
    projectId,
    orgId,
    sprintIds,
    versionIds
  );
  return responseParser
    .setBody({ overall: response })
    .setMessage('successfully fetched overall cycle time')
    .setResponseBodyCode('SUCCESS')
    .setStatusCode(HttpStatusCode['200'])
    .send();
};

export const handler = APIHandler(cycleTimeOverall, {
  eventSchema: transpileSchema(CycleTimeOverallValidator),
});
