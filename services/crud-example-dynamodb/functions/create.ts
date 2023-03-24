import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  if (event.body) {
    const data = JSON.parse(event.body);
    const params = {
      TableName: 'CrudTest',
      Item: data,
    };
    await dynamoDb.put(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(params.Item),
    };
  } else {
    return {
      statusCode: 200,
    };
  }
};
