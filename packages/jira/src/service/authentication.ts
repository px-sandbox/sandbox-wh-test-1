import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import { Jira } from '../lib/jira';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const redirectUrl = await new Jira().initialize();
  return responseParser
    .setBody({ link: redirectUrl })
    .setMessage('JIRA AUTHENTICATION LINK')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
