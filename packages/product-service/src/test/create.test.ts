import { APIGatewayProxyEvent } from 'aws-lambda';
import { createProduct } from '../service/create-product';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let mockDynamoDBClient: ReturnType<typeof mockClient>;

describe('createProduct', () => {
  beforeEach(() => {
    mockDynamoDBClient = mockClient(DynamoDBDocumentClient);
  });

  afterEach(() => {
    mockDynamoDBClient.reset();
  });
  const mockBody = {
    sku: 'test-sku',
    title: 'test-title',
    category: 'test-category',
    subCategory: 'test-subCategory',
  };

  it('returns 400 error when event body is not provided', async () => {
    let event = {};
    const { body, statusCode } = await createProduct(
      event as APIGatewayProxyEvent
    );
    expect(statusCode).toBe(400);
    expect(body).toEqual(
      JSON.stringify({
        data: {},
        message: 'product creation error -- data not provided',
        code: 'ERROR',
      })
    );
  });

  it('returns 201 status code and product when event body is provided', async () => {
    const event = { body: JSON.stringify(mockBody) };
    const { statusCode, body } = await createProduct(
      event as APIGatewayProxyEvent
    );

    console.log(body);
    expect(statusCode).toBe(201);
    expect(body).toEqual(
      JSON.stringify({
        data: event.body,
        message: 'product created successfully',
        code: 'SUCCESS',
      })
    );
  });
});
