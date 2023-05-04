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
} from 'core';
import { region } from '../constant/config';

const createProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.body) {
    logger.info(event.body);
    const productDetails = JSON.parse(JSON.stringify(event.body));
    const params: PutCommandInput = {
      TableName: Table.products.tableName,
      Item: { ...productDetails },
    };
    const product = await ddbDocClient(region as string).send(
      new PutCommand(params)
    );
    logger.info(`putcommand response ${JSON.stringify(product)}`);
    return responseParser
      .setBody(productDetails)
      .setMessage('product created successfully')
      .setStatusCode(HttpStatusCode[201])
      .setResponseBodyCode('SUCCESS')
      .send();
  } else {
    return responseParser
      .setBody({})
      .setMessage('product creation error -- data not provided')
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode('ERROR')
      .send();
  }
};

export const handler = APIHandler(createProduct, {
  eventSchema: transpileSchema(createUserSchema),
});
export { createProduct };
