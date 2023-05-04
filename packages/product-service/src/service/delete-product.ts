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

const deleteUser = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const sku = event.pathParameters!.sku;
  logger.info(`delete product for sku: ${sku} init`);
  const deleteParams = {
    TableName: Table.products.tableName,
    Key: {
      sku,
    },
  };
  const ddbRes = await ddbDocClient(region as string).send(
    new GetCommand(deleteParams)
  );
  logger.info(ddbRes);
  if (ddbRes && !ddbRes.Item) {
    return responseParser
      .setBody({})
      .setMessage('no such product found')
      .setStatusCode(HttpStatusCode[404])
      .setResponseBodyCode('SUCCESS')
      .send();
  }
  const deletedProduct = await ddbDocClient(region as string).send(
    new DeleteCommand(deleteParams)
  );
  return responseParser
    .setBody(deletedProduct)
    .setMessage('product deleted successfully')
    .setStatusCode(HttpStatusCode[204])
    .setResponseBodyCode('SUCCESS')
    .send();
};

export const handler = APIHandler(deleteUser);
