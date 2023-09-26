import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { JiraClient } from '../lib/jira-client';

export const handler = async function (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const organisation = event?.queryStringParameters?.orgName || '';
  const projects = event?.queryStringParameters?.projects?.split(',') || [];

  if (!organisation) {
    return responseParser
      .setBody({})
      .setMessage('Organisation Not found')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('SUCCESS')
      .send();
  }

  if (projects.length === 0) {
    return responseParser
      .setBody({})
      .setMessage('Please send some projects')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('SUCCESS')
      .send();
  }

  const client = await JiraClient.getClient(organisation);

  return responseParser
    .setBody({})
    .setMessage(`Migration for Organisation ${organisation} is started`)
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
