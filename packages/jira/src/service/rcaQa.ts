import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { rcaTableView } from 'src/matrics/get-rca-tabular-view';

const rcaTabularView = async function getRcaTabularView(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
  const response = await rcaTableView(sprintIds, 'qaRca');
  return responseParser
    .setBody(response)
    .setMessage('rca table data QA')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(rcaTabularView);
export { handler, rcaTabularView };
