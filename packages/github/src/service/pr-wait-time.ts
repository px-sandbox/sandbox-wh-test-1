import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prWaitTimeAvg, prWaitTimeGraphData } from 'src/matrics/get-pr-wait-time';
import { prCommentsGraphSchema } from './validations';

const prWaitTimeGraph = async function getPrWaitTimeGraph(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];

  try {
    const [prCommentGraphData, prCommentAvg] = await Promise.all([
      prWaitTimeGraphData(startDate, endDate, interval, repoIds),
      prWaitTimeAvg(startDate, endDate, repoIds),
    ]);
    return responseParser
      .setBody({ graphData: prCommentGraphData, headline: prCommentAvg })
      .setMessage('pr wait time graph data')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(prWaitTimeGraph, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { handler, prWaitTimeGraph };
