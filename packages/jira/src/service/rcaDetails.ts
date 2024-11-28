import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { APIHandler, HttpStatusCode, logger, responseParser } from "core";
import { rcaDetail } from "src/matrics/get-rca-details";

const rcaTabularView = async function getRcaTabularView(
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const type: string = event.queryStringParameters?.type as 'dev' | 'qa' ;
    const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
    try {
      const response = await rcaDetail(sprintIds, type);

      return responseParser
        .setBody(response)
        .setMessage('rca details')
        .setStatusCode(HttpStatusCode['200'])
        .setResponseBodyCode('SUCCESS')
        .send();
    } catch (error) {
      return responseParser
        .setBody(error)
        .setMessage('Failed to fetch RCA details')
        .setStatusCode(HttpStatusCode['500'])
        .setResponseBodyCode('ERROR')
        .send()
    }
  };
  const handler = APIHandler(rcaTabularView);
  export { rcaTabularView, handler };