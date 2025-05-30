import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser, APIHandler } from 'core';
import { transpileSchema } from '@middy/validator/transpile';
import { activeBranchDetailsGraphData } from '../matrics/get-active-branches-details';
import { prWaitTimeBreakdownSchema } from './validations';

const getActiveBranchesDetails = async function getActiveBranchesDetails(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
  const page: number = event.queryStringParameters?.page
    ? parseInt(event.queryStringParameters?.page, 10)
    : 1;
  const limit: number = event.queryStringParameters?.limit
    ? parseInt(event.queryStringParameters?.limit, 10)
    : 10;

  try {
    const activeBranchesDetailsGraph = await activeBranchDetailsGraphData(
      repoIds,
      requestId,
      page,
      limit
    );
    return responseParser
      .setBody(activeBranchesDetailsGraph)
      .setMessage('get active branches details')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({ message: 'active_branches_details.error', error: e, requestId });
    throw new Error(`Something went wrong: ${e}`);
  }
};

const handler = APIHandler(getActiveBranchesDetails, {
  eventSchema: transpileSchema(prWaitTimeBreakdownSchema),
});
export { handler, getActiveBranchesDetails };
