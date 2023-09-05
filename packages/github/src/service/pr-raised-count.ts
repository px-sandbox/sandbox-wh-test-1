import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { numberOfPrRaisedGraph, numberOfPrRaisedtAvg } from '../matrics/get-pr-raised-count';
import { numberOfPrRaisedGraphSchema } from './validations';

const numberOfPrRaised = async function getNumberOfPrRaised(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
  try {
    const [numberOfPrRaisedGraphData, numberOfPrRaisedAvg] = await Promise.all([
      numberOfPrRaisedGraph(startDate, endDate, interval, repoIds),
      numberOfPrRaisedtAvg(startDate, endDate, repoIds),
    ]);
    return responseParser
      .setBody({ graphData: numberOfPrRaisedGraphData, headline: numberOfPrRaisedAvg })
      .setMessage('number of PR raised')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(numberOfPrRaised, {
  eventSchema: transpileSchema(numberOfPrRaisedGraphSchema),
});
export { handler, numberOfPrRaised };
