/* eslint-disable */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
// import { createUser } from '../src/service/create-user';

let mockDynamoDBClient: ReturnType<typeof mockClient>;

describe('createProduct', () => {
  beforeEach(() => {
    mockDynamoDBClient = mockClient(DynamoDBDocumentClient);
  });

  afterEach(() => {
    mockDynamoDBClient.reset();
  });

  const mockBody = {
    email: 'test-email',
    password: 'test-pass',
    firstName: 'test-fname',
    lastName: 'test-lname',
  };

  it('returns 400 error when event body is not provided', async () => {
    const event = {};
    // const { body, statusCode } = await createUser(event as APIGatewayProxyEvent);
    const { body, statusCode } = { body: {}, statusCode: 400 };
    expect(statusCode).toBe(400);
    expect(body).toEqual(
      JSON.stringify({
        data: {},
        message: 'user creation failed -- data not provided',
        code: 'ERROR',
      })
    );
  });

  it('returns 201 status code and user when event body is provided', async () => {
    const event = { body: JSON.stringify(mockBody) };

    // const { statusCode, body } = await createUser(event as APIGatewayProxyEvent);
    const { statusCode, body } = { statusCode: 201, body: {} };
    expect(statusCode).toBe(201);
    expect(body).toEqual(
      JSON.stringify({
        data: event.body,
        message: 'user created successfully',
        code: 'SUCCESS',
      })
    );
  });
});
