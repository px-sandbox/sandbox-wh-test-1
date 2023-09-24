import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import { Jira } from '../lib/jira';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const code: string = event?.queryStringParameters?.code || '';
  const refreshToken = await new Jira().callback(code);
  return responseParser
    .setBody({ refreshToken })
    .setMessage('JIRA CALBACK URL')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
