import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { reopenRateGraph, reopenRateGraphAvg } from 'src/matrics/get-reopen-rates';

const reopenRate = async function (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];

  try {
    const [graphData, graphAvgData] = await Promise.all([
      await reopenRateGraph(sprintIds),
      await reopenRateGraphAvg(sprintIds),
    ]);
    return responseParser
      .setBody({ graphData: graphData, headline: graphAvgData })
      .setMessage('repoen rates fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = reopenRate;
export { handler, reopenRate };
