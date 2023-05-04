import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const ddbClient = (region: string) => new DynamoDBClient({ region });

export { ddbClient };
