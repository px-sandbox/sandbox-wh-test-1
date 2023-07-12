import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prCommentsGraphSchema } from './validations';
import { graphDataForPRComments } from 'src/lib/get-pr-comments';

const prCommentsGraph = async function getPrCommentsGraph(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  let prCommentData;
  try {
    prCommentData = await graphDataForPRComments(startDate, endDate, interval);
    console.log(prCommentData);
  } catch (e) {
    logger.info(e);
  }
  return responseParser
    .setBody(prCommentData)
    .setMessage('get github user details')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(prCommentsGraph, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { handler, prCommentsGraph };
