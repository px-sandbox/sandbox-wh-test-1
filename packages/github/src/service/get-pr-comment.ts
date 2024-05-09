import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prCommentsAvg, prCommentsGraphData } from '../matrics/get-pr-comment';
import { prCommentsGraphSchema } from './validations';

const prCommentsGraph = async function getPrCommentsGraph(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];

  try {
    const [prCommentGraphData, prCommentAvg] = await Promise.all([
      prCommentsGraphData(startDate, endDate, interval, repoIds, requestId),
      prCommentsAvg(startDate, endDate, repoIds, requestId),
    ]);
    return responseParser
      .setBody({ graphData: prCommentGraphData, headline: prCommentAvg })
      .setMessage('pr comments graph data')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({ message: 'prCommentsGraph.error', error: e, requestId });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(prCommentsGraph, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { handler, prCommentsGraph };
