import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prCommentsGraphSchema } from './validations';
import { linesOfCodeAvg, linesOfCodeGraph } from '../matrics/get-lines-of-code';

const linesOfCode = async function getLinesOfCode(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId;
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [''];

  try {
    const [linesOfCodeGraphData, linesOfCodeAvgData] = await Promise.all([
      linesOfCodeGraph(startDate, endDate, interval, repoIds, requestId),
      linesOfCodeAvg(startDate, endDate, repoIds,requestId),
    ]);
    return responseParser
      .setBody({ graphData: linesOfCodeGraphData, headline: linesOfCodeAvgData })
      .setMessage('lines of code data')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({ message: "linesOfCode.error", error: e , requestId});
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(linesOfCode, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { linesOfCode, handler };
