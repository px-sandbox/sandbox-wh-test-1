import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { APIHandler, HttpStatusCode, logger, responseParser } from "core";
import { rcaQaDetail } from "src/matrics/get-rca-details";

const rcaTabularView = async function getRcaTabularView(
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
    try {
      const response = await rcaQaDetail(sprintIds);

      return responseParser
        .setBody(response)
        .setMessage('rca QA details')
        .setStatusCode(HttpStatusCode['200'])
        .setResponseBodyCode('SUCCESS')
        .send();
    } catch (error) {
      return responseParser
        .setBody(error)
        .setMessage('Failed to fetch RCA QA details')
        .setStatusCode(HttpStatusCode['500'])
        .setResponseBodyCode('ERROR')
        .send()
    }
  };
  const handler = APIHandler(rcaTabularView);
  export { rcaTabularView, handler };