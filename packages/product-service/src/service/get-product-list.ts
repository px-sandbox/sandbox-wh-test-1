import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { region } from 'src/constant/config';
import {
  ddbDocClient,
  responseParser,
  HttpStatusCode,
  APIHandler,
  logger,
} from '@my-sst-app/core/index';
import { Table } from 'sst/node/table';
import { Product } from 'src/abstraction/product';

const getProductsList = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logger.info('get products list invoked');
  const getParams = {
    TableName: Table.users.tableName,
  };
  const ddbRes = await ddbDocClient(region as string).send(
    new ScanCommand(getParams)
  );
  logger.info(ddbRes);
  let products: Product[] = [];
  if (ddbRes && ddbRes.Count && ddbRes.Items) {
    products = ddbRes.Items as Product[];
  }
  return responseParser
    .setBody(products)
    .setMessage('get users list')
    .setStatusCode(HttpStatusCode[200])
    .setResponseHeader({ 'x-total-count': ddbRes.Count?.toString() ?? 0 })
    .setResponseBodyCode('SUCCESS')
    .send();
};

export const handler = APIHandler(getProductsList);
