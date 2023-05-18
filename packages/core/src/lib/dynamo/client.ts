import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DYNAMODB_LOCAL_URL, STAGE } from '../../constant/config';

const ddbClient = (region: string): DynamoDBClient =>
  new DynamoDBClient({
    region,
    endpoint: STAGE === 'local' ? DYNAMODB_LOCAL_URL : undefined,
  });

export { ddbClient };
