import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { rcaTableView } from '../matrics/get-rca-tabular-view';

const rcaTabularView = async function getRcaTabularView(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
  const type: string = event.queryStringParameters?.type || 'qaRca';
  const response = await rcaTableView(sprintIds, type);
  return responseParser
    .setBody(response)
    .setMessage('rca table data')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(rcaTabularView);
export { handler, rcaTabularView };
