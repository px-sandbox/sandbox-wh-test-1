import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { reopenRateGraph, reopenRateGraphAvg } from '../matrics/get-reopen-rates';

const reopenRate = async function reopenRateGraphs(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];

  try {
    const [graphData, graphAvgData] = await Promise.all([
      await reopenRateGraph(sprintIds, { requestId, resourceId: sprintIds.join(',') }),
      await reopenRateGraphAvg(sprintIds, { requestId, resourceId: sprintIds.join(',') }),
    ]);
    return responseParser
      .setBody({ graphData, headline: graphAvgData })
      .setMessage('repoen rates fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({
      error: e,
      message: 'reopen rates fetch error',
      requestId,
      resourceId: sprintIds.join(','),
    });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = reopenRate;
export { handler, reopenRate };
