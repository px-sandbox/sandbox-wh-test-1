import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { subtaskMigrate } from 'src/migrations/subtask';
import { getOrganization } from 'src/repository/organization/get-organization';

export const handler = async function migrate(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
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
  await subtaskMigrate(projectId, orgName, orgData.id);
  return responseParser
    .setBody({})
    .setMessage('subtask migration successfull')
    .setStatusCode(HttpStatusCode[400])
    .setResponseBodyCode('SUCCESS')
    .send();
};
