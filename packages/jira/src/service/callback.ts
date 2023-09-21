import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { jira } from 'src/lib/jira';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const code: string = event?.queryStringParameters?.code || '';
    const refresh_token = await new jira().callback(code);
    return responseParser
        .setBody({ refresh_token })
        .setMessage('JIRA CALBACK URL')
        .setStatusCode(HttpStatusCode[200])
        .setResponseBodyCode('SUCCESS')
        .send();
};
