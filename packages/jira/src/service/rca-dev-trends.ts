import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { getRcaDevTrends } from 'src/matrics/get-rca-dev-trends';

const rcaTabularView = async function getRcaTrendsView(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
  const rca: string = event.queryStringParameters?.rca || '';
  const response = await getRcaDevTrends(sprintIds, rca);
  return responseParser
    .setBody(response)
    .setMessage('rca table data DEV')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(rcaTabularView);
export { handler, rcaTabularView };
