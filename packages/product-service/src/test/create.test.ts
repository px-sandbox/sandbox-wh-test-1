import { APIGatewayProxyEvent } from 'aws-lambda';
import { createProduct } from '../service/create-product';
import { describe, expect, test } from 'vitest';

describe('createProduct', () => {
  const mockBody = {
    sku: 'test-sku',
    title: 'test-title',
    category: 'test-category',
    subCategory: 'test-subCategory',
  };

  test('returns 400 error when event body is not provided', async () => {
    let event = {};
    const result = await createProduct(event as APIGatewayProxyEvent);
    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({
      data: {},
      code: 'ERROR',
      message: 'product creation error -- data not provided',
      responseBodyCode: 'ERROR',
    });
  });

  test('returns 201 status code and product when event body is provided', async () => {
    const event = { body: JSON.stringify(mockBody) } as APIGatewayProxyEvent;
    const result = await createProduct(event);
    expect(result.statusCode).toBe(201);
    expect(result.body).toHaveProperty('sku', 'test-sku');
    expect(result.body).toHaveProperty('title', 'test-title');
    expect(result.body).toHaveProperty('category', 'test-category');
    expect(result.body).toHaveProperty('subCategory', 'test-subCategory');
  });

  // Additional test cases can be added to cover edge cases and error scenarios
});
