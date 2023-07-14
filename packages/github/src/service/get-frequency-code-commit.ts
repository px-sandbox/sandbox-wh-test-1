import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import {
  frequencyOfCodeCommitAvg,
  frequencyOfCodeCommitGraph,
} from 'src/matrics/get-frequency-of-commits';
import { prCommentsGraphSchema } from './validations';

const frequencyOfCodeCommits = async function getFrequencyOfCodeCommits(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
  let frequencyOfCodeCommitsGraphData, frequencyOfCodeCommitsAvg;
  try {
    [frequencyOfCodeCommitsGraphData, frequencyOfCodeCommitsAvg] = await Promise.all([
      frequencyOfCodeCommitGraph(startDate, endDate, interval, repoIds),
      frequencyOfCodeCommitAvg(startDate, endDate, repoIds),
    ]);
  } catch (e) {
    logger.error(e);
  }
  return responseParser
    .setBody({ graphData: frequencyOfCodeCommitsGraphData, headline: frequencyOfCodeCommitsAvg })
    .setMessage('get github user details')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(frequencyOfCodeCommits, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { frequencyOfCodeCommits, handler };
