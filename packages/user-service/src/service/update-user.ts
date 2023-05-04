import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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
  const getParams = {
    TableName: Table.users.tableName,
    Key: {
      email,
    },
  };
  const ddbRes = await ddbDocClient(region as string).send(
    new GetCommand(getParams)
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
  const existingUser: User = ddbRes.Item as User;
  const { firstName, lastName, password } = JSON.parse(
    JSON.stringify(event.body)
  );
  const updateParams = {
    TableName: Table.users.tableName,
    Key: {
      email,
    },
    UpdateExpression: 'SET firstName= :fn, lastName= :ln, password= :password',
    ExpressionAttributeValues: {
      ':fn': firstName ?? existingUser.firstName,
      ':ln': lastName ?? existingUser.lastName,
      ':password': password ?? existingUser.password,
    },
    ReturnValues: 'ALL_NEW',
  };
  const updatedUser = await ddbDocClient(region as string).send(
    new UpdateCommand(updateParams)
  );
  return responseParser
    .setBody(updatedUser.Attributes)
    .setMessage('user updated successfully')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};

export const handler = APIHandler(getUser);
