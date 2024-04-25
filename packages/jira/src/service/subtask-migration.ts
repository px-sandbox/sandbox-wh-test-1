import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import { subtaskMigrate } from '../migrations/subtask';
import { getOrganization } from '../repository/organization/get-organization';

export const handler = async function migrate(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const orgName = event?.queryStringParameters?.orgName ?? '';
  const projectId = event?.queryStringParameters?.projectId;
  const orgData = await getOrganization(orgName);
  if (!orgName || !projectId || !orgData) {
    return responseParser
      .setBody({})
      .setMessage('organization and projects are required')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('ERROR')
      .send();
  }
  await subtaskMigrate(projectId, orgName, orgData.id, { requestId, resourceId: projectId });
  return responseParser
    .setBody({})
    .setMessage('subtask migration successfull')
    .setStatusCode(HttpStatusCode[400])
    .setResponseBodyCode('SUCCESS')
    .send();
};
