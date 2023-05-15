import { getUser } from '../src/service/get-user';
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

  it('returns a not found response when the user does not exist', async () => {
    const event = {
      pathParameters: { email: '123' },
    } as unknown as APIGatewayProxyEvent;

    mockDynamoDBClient
      .on(GetCommand, {
        TableName: Table.users.tableName,
        Key: { email: 'test-email' },
      })
      .resolves({ Item: undefined });

    const result = await getUser(event);
    expect(result.statusCode).toBe(404);
    expect(result.body).toEqual(
      JSON.stringify({
        data: {},
        message: 'no such user found',
        code: 'SUCCESS',
      })
    );
  });

  it('returns the user details when the user exists', async () => {
    const event = {
      pathParameters: { email: 'r@sg.com' },
    } as unknown as APIGatewayProxyEvent;
    const ddbRes = {
      $metadata: {
        attempts: 1,
        httpStatusCode: 200,
        requestId: '5BU2SPI974FFN6TC4LM6LC42VJVV4KQNSO5AEMVJF66Q9ASUAAJG',
        totalRetryDelay: 0,
      },
      Item: {
        email: 'r@sg.com',
        firstName: 'r',
        lastName: 's',
        password: '1234567',
      },
    };
    mockDynamoDBClient
      .on(GetCommand, {
        TableName: Table.users.tableName,
        Key: { email: 'r@sg.com' },
      })
      .resolves(ddbRes);
    const result = await getUser(event);
    console.log(result);
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual(
      JSON.stringify({
        data: ddbRes.Item,
        message: 'user found',
        code: 'SUCCESS',
      })
    );
  });
});
