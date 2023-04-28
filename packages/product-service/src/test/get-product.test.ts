import { getProduct } from '../service/get-product';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

let mockDynamoDBClient: ReturnType<typeof mockClient>;

describe('getProduct', () => {
  beforeEach(() => {
    mockDynamoDBClient = mockClient(DynamoDBDocumentClient);
  });

  afterEach(() => {
    mockDynamoDBClient.reset();
  });

  it('returns a not found response when the product does not exist', async () => {
    const event = {
      pathParameters: { sku: '123' },
    } as unknown as APIGatewayProxyEvent;

    mockDynamoDBClient
      .on(GetCommand, {
        TableName: Table.products.tableName,
        Key: { sku: 'test-sku' },
      })
      .resolves({ Item: undefined });

    const result = await getProduct(event);
    expect(result.statusCode).toBe(404);
    expect(result.body).toEqual(
      JSON.stringify({
        data: {},
        message: 'no such product found',
        code: 'SUCCESS',
      })
    );
  });

  it('returns the product details when the product exists', async () => {
    const event = {
      pathParameters: { sku: '123' },
    } as unknown as APIGatewayProxyEvent;
    const ddbRes = { Item: { sku: '123', name: 'Product 123' } };
    mockDynamoDBClient
      .on(GetCommand, {
        TableName: Table.products.tableName,
        Key: { sku: '123' },
      })
      .resolves(ddbRes);
    const result = await getProduct(event);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual(
      JSON.stringify({
        data: { sku: '123', name: 'Product 123' },
        message: 'product found',
        code: 'SUCCESS',
      })
    );
  });
});
