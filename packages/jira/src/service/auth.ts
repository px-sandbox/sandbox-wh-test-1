import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import { Config } from 'sst/node/config';
import Url from 'url';

// add all the permissions required for Jira Integration here
const permissions = [
  'offline_access',
  'read:jira-work',
  'read:jira-user',
  'manage:jira-configuration',
  'write:jira-work',
  'manage:jira-webhook',
  'manage:jira-data-provider',
  'manage:jira-project',
  'read:board-scope:jira-software',
  'read:issue-details:jira',
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
