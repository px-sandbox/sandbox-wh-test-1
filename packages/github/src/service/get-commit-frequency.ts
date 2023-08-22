import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import {
  frequencyOfCodeCommitAvg,
  frequencyOfCodeCommitGraph,
} from '../matrics/get-commit-frequency';
import { prCommentsGraphSchema } from './validations';

const frequencyOfCodeCommits = async function getFrequencyOfCodeCommits(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [''];

  try {
    const [frequencyOfCodeCommitsGraphData, frequencyOfCodeCommitsAvg] = await Promise.all([
      frequencyOfCodeCommitGraph(startDate, endDate, interval, repoIds),
      frequencyOfCodeCommitAvg(startDate, endDate, repoIds),
    ]);
    return responseParser
      .setBody({ graphData: frequencyOfCodeCommitsGraphData, headline: frequencyOfCodeCommitsAvg })
      .setMessage('frequency of code commits data')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(frequencyOfCodeCommits, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { frequencyOfCodeCommits, handler };
