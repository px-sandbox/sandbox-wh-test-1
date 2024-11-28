import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { APIHandler, HttpStatusCode, logger, responseParser } from "core";
import { rcaQaTableDetailed } from "src/matrics/get-rca-tabular-view";
import { rcaTableDetailed } from "src/matrics/get-rca-tabular-view";

const rcaTabularView = async function getRcaTabularView(
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> {
    const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
    const response = await rcaQaTableDetailed(
        sprintIds
      );
      return responseParser
        .setBody(response)
        .setMessage('rca table data')
        .setStatusCode(HttpStatusCode['200'])
        .setResponseBodyCode('SUCCESS')
        .send();

  };
  const handler = APIHandler(rcaTabularView);
  export { rcaTabularView, handler };
  