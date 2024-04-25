/* eslint-disable max-lines-per-function */
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { Queue } from 'sst/node/queue';
import { ProjectTypeKey } from 'abstraction/jira/enums/project';
import { JiraClient } from '../lib/jira-client';

const sqsClient = SQSClient.getInstance();

export const handler = async function migrate(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const organization = event?.queryStringParameters?.orgName ?? '';
  const projects = event?.queryStringParameters?.projects?.split(',') || [];
  const importUsers = event?.queryStringParameters?.importUsers ?? 'false';

  if (!organization) {
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
      .setMessage('Please send some projects name to migrate')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('SUCCESS')
      .send();
  }

  const client = await JiraClient.getClient(organization);

  let usersFromJira: Jira.ExternalType.Api.User[] = [];
  if (importUsers === 'true') {
    usersFromJira = await client.getUsers();
  }

  const projectsFromJira = await client.getProjects();

  // Filter from projects based on name and project type ('software')
  const projectsToSend = projectsFromJira.filter(
    (project) =>
      projects.includes(project.name.trim()) &&
      project.projectTypeKey.toLowerCase() === ProjectTypeKey.SOFTWARE
  );

  if (projectsToSend.length === 0) {
    return responseParser.setMessage('No projects to migrate').send();
  }
  logger.info({
    requestId,
    message: `

  SENDING Projects ############

  ${JSON.stringify(projectsToSend.map(({ name }) => name).join(' | '))}

  Users: ${usersFromJira.length}

  `,
  });

  await Promise.all([
    ...projectsToSend.map(({ id }) =>
      sqsClient.sendMessage(
        {
          organization,
          projectId: id,
        },
        Queue.qProjectMigrate.queueUrl,
        { requestId }
      )
    ),
    ...usersFromJira.map((user) =>
      sqsClient.sendMessage({ organization, user }, Queue.qUserMigrate.queueUrl, { requestId })
    ),
  ]);

  return responseParser
    .setBody({})
    .setMessage(`Migration for Organisation ${organization} is started`)
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};

export const issueStatusHandler = async function issueStatusMigration(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const organization = event?.queryStringParameters?.orgName ?? '';
  if (!organization) {
    return responseParser
      .setBody({})
      .setMessage('Organisation Not found')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('SUCCESS')
      .send();
  }

  const client = await JiraClient.getClient(organization);
  const issueStatuses = await client.getIssueStatuses();

  await Promise.all([
    ...issueStatuses.map((status) =>
      sqsClient.sendMessage({ organization, status }, Queue.qIssueStatusMigrate.queueUrl, {
        requestId,
      })
    ),
  ]);
  return responseParser
    .setBody({})
    .setMessage(`Issue status Migration for Organisation ${organization} is started`)
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
