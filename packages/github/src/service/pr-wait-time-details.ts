import { transpileSchema } from '@middy/validator/transpile';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prWaitTimeDetailsData } from '../matrics/get-pr-wait-time-details';
import { prWaitTimeBreakdownSchema } from './validations';

const prWaitTimeBreakdown = async function getprWaitTimeBreakdown(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
  const page: string = event.queryStringParameters?.page ?? '1';
  const limit: string = event.queryStringParameters?.limit ?? '10';
  const sortKey: Github.Enums.PrDetailsSortKey =
    (event.queryStringParameters?.sortKey as Github.Enums.PrDetailsSortKey) ??
    Github.Enums.PrDetailsSortKey.WAITTIME;
  const sortOrder: Github.Enums.SortOrder =
    (event.queryStringParameters?.sortOrder as Github.Enums.SortOrder) ??
    Github.Enums.SortOrder.DESC;
  const orgId: string = event.queryStringParameters?.orgId ?? '';

  try {
    const sort = {
      key: sortKey,
      order: sortOrder,
    };

    const prCommentGraphData = await prWaitTimeDetailsData(
      startDate,
      endDate,
      parseInt(page, 10),
      parseInt(limit, 10),
      repoIds,
      sort,
      orgId,
      requestId
    );

    return responseParser
      .setBody({ ...prCommentGraphData })
      .setMessage('pr wait breakdown data')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({ message: 'prWaitTimeBreakdown', error: e, requestId });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = APIHandler(prWaitTimeBreakdown, {
  eventSchema: transpileSchema(prWaitTimeBreakdownSchema),
});
export { handler, prWaitTimeBreakdown };
