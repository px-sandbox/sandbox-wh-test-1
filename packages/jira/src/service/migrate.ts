import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { Queue } from 'sst/node/queue';
import { SQSClient } from '@pulse/event-handler';
import { JiraClient } from '../lib/jira-client';

export const handler = async function migrate(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const organization = event?.queryStringParameters?.orgName ?? '';
  const projects = event?.queryStringParameters?.projects?.split(',') || [];

  const sqsClient = new SQSClient();

  if (!organization) {
    return responseParser
      .setBody({})
      .setMessage('Organisation Not found')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('SUCCESS')
      .send();
  }

  // if (projects.length === 0) {
  //   return responseParser
  //     .setBody({})
  //     .setMessage('Please send some projects')
  //     .setStatusCode(HttpStatusCode[400])
  //     .setResponseBodyCode('SUCCESS')
  //     .send();
  // }

  const client = await JiraClient.getClient(organization);

  const [
    projectsFromJira,
    usersFromJira
  ] = await Promise.all([
    client.getProjects(),
    client.getUsers(),
  ]);

  // Filter from projects
  const projectsToSend = projectsFromJira.filter((project) => projects.includes(project.name));

  logger.info(`

  SENDING Projects ############

  ${JSON.stringify(projectsToSend.map(({ name }) => name).join(" | "))}

  Users: ${usersFromJira.length}

  `);


  await Promise.all([
    ...projectsToSend.map(({ id }) =>
      sqsClient.sendMessage(
        {
          organization,
          projectId: id,
        },
        Queue.jira_project_migrate.queueUrl
      )
    ),
    // ...usersFromJira.map((user) =>
    //   sqsClient.sendMessage({ organization, user }, Queue.jira_user_migrate.queueUrl)
    // ),
  ]);

  return responseParser
    .setBody({})
    .setMessage(`Migration for Organisation ${organization} is started`)
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
