import { transpileSchema } from '@middy/validator/transpile';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { fetchCycleTimeDetailed } from '../../matrics/cycle-time/detailed';
import { CycleTimeDetailedValidator } from '../validations';

const cycleTimeDetailed = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  const sprintId = event.queryStringParameters?.sprintId ?? '';
  const projectId = event.queryStringParameters?.projectId ?? '';
  const orgId = event.queryStringParameters?.orgId ?? '';
  const response = await fetchCycleTimeDetailed(
    { requestId, resourceId: sprintId },
    sprintId,
    projectId,
    orgId
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
