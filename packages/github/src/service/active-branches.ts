import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser, APIHandler } from 'core';
import { transpileSchema } from '@middy/validator/transpile';
import { activeBranchGraphData, activeBranchesAvg } from '../matrics/get-active-no-of-branches';
import { prCommentsGraphSchema } from './validations';

const activeBranches = async function getActiveBranches(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId;
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const interval: string = event.queryStringParameters?.interval || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];

  try {
    const [activeBranchesGraph, activeBranchAvg] = await Promise.all([
      activeBranchGraphData(startDate, endDate, interval, repoIds, requestId),
      activeBranchesAvg(startDate, endDate, repoIds, requestId),
    ]);
    return responseParser
      .setBody({ graphData: activeBranchesGraph, headline: activeBranchAvg })
      .setMessage('get active branches')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({ message: "active_branches.error", error: e, requestId });
    throw new Error(`Something went wrong: ${e}`);
  }
};

const handler = APIHandler(activeBranches, {
  eventSchema: transpileSchema(prCommentsGraphSchema),
});
export { handler, activeBranches };
