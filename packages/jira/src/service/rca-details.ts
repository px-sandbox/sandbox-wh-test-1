import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { rcaDetailedView } from 'src/matrics/get-rca-details';

const rcaDetailView = async function getRcaTabularView(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
  const type: string = event.queryStringParameters?.type || 'qaRca';
  try {
    const response = await rcaDetailedView(sprintIds, type);

    return responseParser
      .setBody(response)
      .setMessage('rca DEV details')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    return responseParser
      .setBody(error)
      .setMessage('Failed to fetch RCA DEV details')
      .setStatusCode(HttpStatusCode['500'])
      .setResponseBodyCode('ERROR')
      .send();
  }
};
const handler = APIHandler(rcaDetailView);
export { handler, rcaDetailView };
