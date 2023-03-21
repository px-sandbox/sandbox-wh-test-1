import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export const main: APIGatewayProxyHandlerV2 = async (event: any) => {
  const data = JSON.parse(event.body);

  const params = {
    TableName: 'CrudTest',
    Key: {
      id: event.pathParameters.id,
    },
    UpdateExpression: 'SET field1 = :data',
    ExpressionAttributeValues: {
      ':data': data.content || null,
    },
    ReturnValues: 'ALL_NEW',
  };

  const results = await dynamoDb.update(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(results.Attributes),
  };
};
