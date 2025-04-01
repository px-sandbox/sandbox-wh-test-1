import { transpileSchema } from '@middy/validator/transpile';
import { CycleTimeDetailSortKey } from 'abstraction/jira/enums';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { fetchCycleTimeDetailed } from '../../matrics/cycle-time/detailed';
import { CycleTimeDetailedValidator } from '../validations';

const cycleTimeDetailed = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  const sprintId = event.queryStringParameters?.sprintId ?? '';
  const versionId = event.queryStringParameters?.versionId ?? '';
  const orgId = event.queryStringParameters?.orgId ?? '';
  const sortKey =
    (event.queryStringParameters?.sortKey as CycleTimeDetailSortKey) ??
    CycleTimeDetailSortKey.DEVELOPMENT;
  const sortOrder = (event.queryStringParameters?.sortOrder as 'asc' | 'desc') ?? 'asc';
  const response = await fetchCycleTimeDetailed(
    { requestId, resourceId: sprintId ?? versionId },
    orgId,
    sortKey,
    sortOrder,
    sprintId,
    versionId
  );
  return responseParser
    .setBody(response)
    .setMessage('successfully fetched cycle time details')
    .setResponseBodyCode('SUCCESS')
    .setStatusCode(HttpStatusCode['200'])
    .send();
};

export const handler = APIHandler(cycleTimeDetailed, {
  eventSchema: transpileSchema(CycleTimeDetailedValidator),
});
