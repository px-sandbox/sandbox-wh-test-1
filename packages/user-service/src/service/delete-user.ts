import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { region } from 'src/constant/config';
import {
  ddbDocClient,
  responseParser,
  HttpStatusCode,
  APIHandler,
  logger,
} from 'core';
import { Table } from 'sst/node/table';
import { User } from 'src/abstraction/user';

const getUser = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const email = event.pathParameters!.email;
  logger.info(`update users details for email: ${email} init`);
  const deleteParams = {
    TableName: Table.users.tableName,
    Key: {
      email,
    },
  };
  const ddbRes = await ddbDocClient(region as string).send(
    new GetCommand(deleteParams)
  );
  logger.info(ddbRes);
  if (ddbRes && !ddbRes.Item) {
    return responseParser
      .setBody({})
      .setMessage('no such user found')
      .setStatusCode(HttpStatusCode[404])
      .setResponseBodyCode('SUCCESS')
      .send();
  }
  const deletedUser = await ddbDocClient(region as string).send(
    new DeleteCommand(deleteParams)
  );
  return responseParser
    .setBody(deletedUser)
    .setMessage('user deleted successfully')
    .setStatusCode(HttpStatusCode[204])
    .setResponseBodyCode('SUCCESS')
    .send();
};

export const handler = APIHandler(getUser);
