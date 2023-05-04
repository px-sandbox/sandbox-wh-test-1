import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { region } from '../constant/config';
import {
  ddbDocClient,
  responseParser,
  HttpStatusCode,
  APIHandler,
  logger,
} from 'core';
import { Table } from 'sst/node/table';

const getProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const sku = event.pathParameters!.sku;
  logger.info(`get product details for sku: ${sku}`);
  const getParams = {
    TableName: Table.products.tableName,
    Key: {
      sku,
    },
  };
  const ddbRes = await ddbDocClient(region as string).send(
    new GetCommand(getParams)
  );
  logger.info(ddbRes);
  let user = {};
  let message = 'no such product found';
  let statusCode = HttpStatusCode[404];
  if (ddbRes && ddbRes.Item) {
    user = ddbRes.Item;
    message = 'product found';
    statusCode = HttpStatusCode[200];
  }
  return responseParser
    .setBody(user)
    .setMessage(message)
    .setStatusCode(statusCode)
    .setResponseBodyCode('SUCCESS')
    .send();
};

export const handler = APIHandler(getProduct);

export { getProduct };
