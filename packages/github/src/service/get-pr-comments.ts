import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prCommentsAvg, prCommentsGraphData } from 'src/lib/get-pr-comments';
import { prCommentsGraphSchema } from './validations';

const prCommentsGraph = async function getPrCommentsGraph(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
  let prCommentGraphData: any, prCommentAvg: any;
  try {
    prCommentGraphData = await prCommentsGraphData(startDate, endDate, interval, repoIds);
    prCommentAvg = await prCommentsAvg(startDate, endDate, repoIds);
  } catch (e) {
    logger.info(e);
  }
  return responseParser
    .setBody({ prCommentGraphData, headline: prCommentAvg })
    .setMessage('get github user details')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(prCommentsGraph, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { handler, prCommentsGraph };
