import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prCommentsGraphSchema } from './validations';
import { linesOfCodeAvg, linesOfCodeGraph } from '../matrics/get-lines-of-code';

const linesOfCode = async function getLinesOfCode(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [''];

  try {
    // const test = await linesOfCodeGraph(startDate, endDate, interval, repoIds);
    // const test2 = await linesOfCodeAvg(startDate, endDate, repoIds);
    // console.log('test', test);
    // console.log('test2', test2);
    const [frequencyOfCodeCommitsGraphData, frequencyOfCodeCommitsAvg] = await Promise.all([
      linesOfCodeGraph(startDate, endDate, interval, repoIds),
      linesOfCodeAvg(startDate, endDate, repoIds),
    ]);
    return responseParser
      .setBody({ graphData: frequencyOfCodeCommitsGraphData, headline: frequencyOfCodeCommitsAvg })
      .setMessage('lines of code data')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(linesOfCode, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { linesOfCode, handler };
