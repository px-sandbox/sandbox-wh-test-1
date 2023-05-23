import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';
import { region } from '../../constant/config';
import { ddbClient } from './client';

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: true, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: false, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

// Create the DynamoDB Document client.

const ddbDocClient = (region: string): DynamoDBDocumentClient =>
  DynamoDBDocumentClient.from(ddbClient(region), translateConfig);

const updateTable = async (orgObj: any): Promise<void> => {
  const putParams = {
    TableName: Table.GithubMapping.tableName,
    Item: {
      parentId: orgObj.id,
      githubId: orgObj.body.id,
    },
  };
  await ddbDocClient(region as string).send(new PutCommand(putParams));
};

const find = async (getParams: QueryCommandInput): Promise<any | undefined> => {
  const ddbRes = await ddbDocClient(region as string).send(new QueryCommand(getParams));
  return ddbRes.Items ? ddbRes.Items[0] : undefined;
};
export { ddbDocClient, find, updateTable };
