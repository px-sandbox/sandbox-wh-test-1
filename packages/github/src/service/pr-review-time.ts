import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prReviewTimeAvg, prReviewTimeGraphData } from 'src/matrics/get-pr-review-time';
import { prCommentsGraphSchema } from './validations';

const prReviewTimeGraph = async function getPrCommentsGraph(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];

  try {
    const [prCommentGraphData, prCommentAvg] = await Promise.all([
      prReviewTimeGraphData(startDate, endDate, interval, repoIds),
      prReviewTimeAvg(startDate, endDate, repoIds),
    ]);
    return responseParser
      .setBody({ graphData: prCommentGraphData, headline: prCommentAvg })
      .setMessage('pr review time graph data')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(prReviewTimeGraph, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { handler, prReviewTimeGraph };
