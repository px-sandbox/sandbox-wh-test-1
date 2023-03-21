import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export async function main() {
  const params = {
    // Get the table name from the environment variable
    TableName: 'CrudTest',
    // Get all the rows where the userId is our hardcoded user id
    Key: {},
  };
  const results = await dynamoDb.get(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(results.$response),
  };
}
