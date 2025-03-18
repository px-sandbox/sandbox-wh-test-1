import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getAllVersions } from '../repository/version/get-versions';

const versions = async function getVersions(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  const { orgId, projectId } = event.queryStringParameters as { orgId: string; projectId: string };
  logger.info({ requestId, resourceId: projectId, message: 'versions.handler', data: { orgId } });
  const body = await getAllVersions(projectId, orgId, { requestId });
  return responseParser
    .setBody(body)
    .setMessage('Get versions successfully')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};

const handler = versions;
export { handler, versions };
