import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { FILTER_ID_TYPES } from 'abstraction/jira/enums';
import { ftpRateGraph, ftpRateGraphAvg } from '../matrics/get-ftp-rate';

const ftpRate = async function ftpRateGraphs(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const queryParams = event.queryStringParameters || {};
  const { organizationId, projectId, sprintIds: sprintIdsParam, releaseIds: releaseIdsParam } = queryParams as {
    [key: string]: string
  };
  if ((sprintIdsParam && releaseIdsParam) || (!sprintIdsParam && !releaseIdsParam)) {
    return responseParser
      .setBody({})
      .setMessage('Please provide either sprintIds or releaseIds, but not both or neither')
      .setStatusCode(HttpStatusCode['400'])
      .setResponseBodyCode('ERROR')
      .send();
  }
  const isUsingSprintIds = Boolean(sprintIdsParam);
  const idType = isUsingSprintIds ? FILTER_ID_TYPES.SPRINT : FILTER_ID_TYPES.VERSION;

  // Parse the IDs from the query parameter
  const ids = isUsingSprintIds
    ? sprintIdsParam.split(',').filter(id => id.trim() !== '')
    : releaseIdsParam.split(',').filter(id => id.trim() !== '');

  try {
    const [graphData, graphAvgData] = await Promise.all([
      await ftpRateGraph(organizationId, projectId, ids, idType, {
        requestId,
        resourceId: projectId,
      }),
      await ftpRateGraphAvg(ids, idType, { requestId, resourceId: projectId }),
    ]);
    return responseParser
      .setBody({ graphData, headline: graphAvgData })
      .setMessage('FTP rates fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({ requestId, resourceId: projectId, message: 'FTP rates fetch error', error: e });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = ftpRate;
export { ftpRate, handler };
