import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { region } from 'src/constant/config';
import {
  ddbDocClient,
  responseParser,
  HttpStatusCode,
  APIHandler,
  logger,
} from '@my-sst-app/core/index';
import { Table } from 'sst/node/table';

const getUser = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const email = event.pathParameters!.email;
  logger.info(`get users details for email: ${email}`);
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
  let user = {};
  let message = 'no such user found';
  let statusCode = HttpStatusCode[404];
  if (ddbRes && ddbRes.Item) {
    user = ddbRes.Item;
    message = 'user found';
    statusCode = HttpStatusCode[200];
  }
  return responseParser
    .setBody(user)
    .setMessage(message)
    .setStatusCode(statusCode)
    .setResponseBodyCode('SUCCESS')
    .send();
};

export const handler = APIHandler(getUser);
