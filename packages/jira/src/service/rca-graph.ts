import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { FILTER_ID_TYPES } from 'abstraction/jira/enums';
import { rcaGraphView } from '../matrics/get-rca-graph';

const rcaGrapViews = async function getRcaTabularView(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const type: string = event.queryStringParameters?.type || 'qaRca';
  const queryParams = event.queryStringParameters || {};
  const { sprintIds: sprintIdsParam, releaseIds: releaseIdsParam } = queryParams as {
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

  const response = await rcaGraphView(ids, idType, type);
  return responseParser
    .setBody(response)
    .setMessage('rca graph data')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(rcaGrapViews);
export { handler, rcaGraphView };
