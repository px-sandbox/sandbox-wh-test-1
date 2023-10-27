import Url from 'url';
import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import { Config } from 'sst/node/config';

// add all the permissions required for Jira Integration here
// const permissions = [
//   'offline_access',
//   'read:jira-work',
//   'read:jira-user',
//   'manage:jira-configuration',
//   'write:jira-work',
//   'manage:jira-webhook',
//   'manage:jira-data-provider',
//   'manage:jira-project',
//   'read:board-scope:jira-software',
//   'read:issue-details:jira',
//   'read:board-scope.admin:jira-software',
//    'read:project:jira',
// ];

const permissions = [
  "offline_access",
  "read:jira-work",
  "read:jira-user",
  "manage:jira-configuration",
  "write:jira-work",
  "manage:jira-webhook",
  "manage:jira-data-provider",
  "manage:jira-project",
  "read:issue-details:jira",
  "read:board-scope:jira-software",
  "read:sprint:jira-software",
  "read:board-scope.admin:jira-software",
  "read:project:jira",
  "read:workflow-scheme:jira",
  "read:application-role:jira",
  "read:avatar:jira",
  "read:group:jira",
  "read:issue-type:jira",
  "read:project-category:jira",
  "read:project:jira",
  "read:user:jira",
  "read:issue:jira-software",
  "read:jql:jira",
];

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const redirectUrl = await Url.format({
    protocol: 'https',
    hostname: 'auth.atlassian.com',
    pathname: '/authorize',
    query: {
      audience: 'api.atlassian.com',
      client_id: Config.JIRA_CLIENT_ID,
      redirect_uri: Config.JIRA_REDIRECT_URI,
      scope: permissions.join(' '),
      response_type: 'code',
      prompt: 'consent',
    },
  });
  return responseParser
    .setBody({ link: redirectUrl })
    .setMessage('Visit this link on Browser and allow accesses')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
