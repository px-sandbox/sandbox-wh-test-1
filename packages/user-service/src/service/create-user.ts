import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { transpileSchema } from '@middy/validator/transpile';
import { createUserSchema } from './validations';
import { PutCommand, PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';
import {
  logger,
  APIHandler,
  HttpStatusCode,
  ddbDocClient,
  responseParser,
} from '@my-sst-app/core/index';
import { region } from '../constant/config';

const createUser = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.body) {
    logger.info(event.body);
    const { email, password, firstName, lastName } = JSON.parse(
      JSON.stringify(event.body)
    );
    const params: PutCommandInput = {
      TableName: Table.users.tableName,
      Item: {
        email,
        password,
        firstName,
        lastName,
      },
    };
    const user = await ddbDocClient(region as string).send(
      new PutCommand(params)
    );
    logger.info(user);
    return responseParser
      .setBody(event.body)
      .setMessage('signup successful')
      .setStatusCode(HttpStatusCode[201])
      .setResponseBodyCode('SUCCESS')
      .send();
  } else {
    return responseParser
      .setBody({})
      .setMessage('signup error -- data not provided')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('ERROR')
      .send();
  }
};

export const handler = APIHandler(createUser, {
  eventSchema: transpileSchema(createUserSchema),
});
