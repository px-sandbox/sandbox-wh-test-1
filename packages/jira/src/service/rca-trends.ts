import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { getRcaTrends } from 'src/matrics/get-rca-trends';

const rcaTrendsView = async function getRcaTrendsView(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
  const rca: string = event.queryStringParameters?.rca || '';
  const type: string = event.queryStringParameters?.type || 'qaRca';
  const response = await getRcaTrends(sprintIds, rca, type);
  return responseParser
    .setBody(response)
    .setMessage('rca table data DEV')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(rcaTrendsView);
export { handler, rcaTrendsView };
