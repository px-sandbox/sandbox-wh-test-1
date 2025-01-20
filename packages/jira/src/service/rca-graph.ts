import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { rcaGraphView } from '../matrics/get-rca-graph';

const rcaGrapViews = async function getRcaTabularView(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
  const type: string = event.queryStringParameters?.type || 'qaRca';
  const response = await rcaGraphView(sprintIds, type);
  return responseParser
    .setBody(response)
    .setMessage('rca graph data')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(rcaGrapViews);
export { handler, rcaGraphView };
