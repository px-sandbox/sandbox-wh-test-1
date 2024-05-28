import { Other } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { transpileSchema } from '@middy/validator/transpile';
import { fetchSprintsFromES, calculateCycleTime } from '../../matrics/cycle-time/overall';
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
  startDate: string,
  endDate: string,
  orgId: string
): Promise<number> {
  const sprints = await fetchSprintsFromES(reqCtx, projectId, startDate, endDate, orgId);

  return calculateCycleTime(reqCtx, sprints, orgId);
}
export const cycleTimeOverall = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  const startDate = event.queryStringParameters?.startDate ?? '';
  const endDate = event.queryStringParameters?.endDate ?? '';
  const orgId = event.queryStringParameters?.orgId ?? '';
  const projectId = event.queryStringParameters?.projectId ?? '';

  const response = await fetchOverallCycleTime(
    { requestId, resourceId: projectId },
    projectId,
    startDate,
    endDate,
    orgId
  );
  return responseParser
    .setBody(response)
    .setMessage('successfully fetched overall cycle time')
    .setResponseBodyCode('SUCCESS')
    .setStatusCode(HttpStatusCode['200'])
    .send();
};

export const handler = APIHandler(cycleTimeOverall, {
  eventSchema: transpileSchema(CycleTimeOverallValidator),
});
