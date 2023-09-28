import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { JiraClient } from '../lib/jira-client';

export const handler = async function (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const organisation = event?.queryStringParameters?.orgName || '';
  const projects = event?.queryStringParameters?.projects?.split(',') || [];

  const sqsClient = new SQSClient();

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

  const [projectsFromJira, usersFromJira] = await Promise.all([
    client.getProjects(),
    client.getUsers(),
  ]);

  // Filter from projects

  await Promise.all([
    ...projectsFromJira.map((project) =>
      sqsClient.sendMessage(
        { organisation, projectId: project.id },
        Queue.jira_project_migrate.queueUrl
      )
    ),
    ...usersFromJira.map((user) =>
      sqsClient.sendMessage({ organisation, user }, Queue.jira_user_migrate.queueUrl)
    ),
  ]);

  return responseParser
    .setBody({})
    .setMessage(`Migration for Organisation ${organisation} is started`)
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
