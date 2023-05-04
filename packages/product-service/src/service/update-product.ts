import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { region } from 'src/constant/config';
import {
  ddbDocClient,
  responseParser,
  HttpStatusCode,
  APIHandler,
  logger,
} from 'core';
import { Table } from 'sst/node/table';
import { Product } from 'src/abstraction/product';

const updateProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const sku = event.pathParameters!.sku;
  logger.info(`update product details for sku: ${sku} init`);
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
  if (ddbRes && !ddbRes.Item) {
    return responseParser
      .setBody({})
      .setMessage('no such product found')
      .setStatusCode(HttpStatusCode[404])
      .setResponseBodyCode('SUCCESS')
      .send();
  }
  const existingUser: Product = ddbRes.Item as Product;
  const { title, category, subCategory } = JSON.parse(
    JSON.stringify(event.body)
  );
  const updateParams = {
    TableName: Table.users.tableName,
    Key: {
      sku,
    },
    UpdateExpression:
      'SET title= :title, category= :category, subCategory= :subCategory',
    ExpressionAttributeValues: {
      ':title': title ?? existingUser.title,
      ':category': category ?? existingUser.category,
      ':subCategory': subCategory ?? existingUser.subCategory,
    },
    ReturnValues: 'ALL_NEW',
  };
  const updatedProduct = await ddbDocClient(region as string).send(
    new UpdateCommand(updateParams)
  );
  return responseParser
    .setBody(updatedProduct.Attributes)
    .setMessage('product updated successfully')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};

export const handler = APIHandler(updateProduct);
