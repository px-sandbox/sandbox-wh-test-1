import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prCommentsAvg, prCommentsGraphData } from 'src/matrics/get-pr-comments';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { prCommentsGraphSchema } from './validations';

const prCommentsGraph = async function getPrCommentsGraph(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
  let prCommentGraphData: IPrCommentAggregationResponse | null | undefined;
    let prCommentAvg: string | null | undefined;
  try {
    [prCommentGraphData, prCommentAvg] = await Promise.all([
      prCommentsGraphData(startDate, endDate, interval, repoIds),
      prCommentsAvg(startDate, endDate, repoIds),
    ]);
  } catch (e) {
    logger.error(e);
  }
  return responseParser
    .setBody({ graphData: prCommentGraphData, headline: prCommentAvg })
    .setMessage('pr comments graph data')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(prCommentsGraph, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { handler, prCommentsGraph };
