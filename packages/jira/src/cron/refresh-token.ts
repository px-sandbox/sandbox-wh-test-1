import { DynamoDbDocClient } from '@pulse/dynamodb';
import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { Table } from 'sst/node/table';
import { getTokens } from '../lib/get-token';
import { JiraCredsMapping } from '../model/prepare-creds-params';

// get credIds from dynamoDB
// for each credId, call getToken
// update the refresh token in dynamoDB
export async function updateRefreshToken(): Promise<APIGatewayProxyResult> {
  logger.info(`Get refresh token invoked at: ${new Date().toISOString()}`);
  const ddbClient = DynamoDbDocClient.getInstance();

  const data: { id: string; refresh_token: string }[] = await ddbClient.scan<{
    id: string;
    refresh_token: string;
  }>({
    TableName: Table.jiraCreds.tableName,
  });

  const ddbResp = data.map((item): { credId: string; refreshToken: string } => ({
    credId: item.id,
    refreshToken: item.refresh_token,
  }));
  if (ddbResp.length === 0) {
    throw new Error('No refresh token found');
  }
  await Promise.all(
    ddbResp.map(async (item) => {
      logger.info(`Updating Refresh token for credId...: ${item.credId}`);
      const newRefreshToken = await getTokens(item.refreshToken);
      logger.info(`New refresh token: ${newRefreshToken}`);
      await ddbClient.put(new JiraCredsMapping().preparePutParams(item.credId, newRefreshToken));
      logger.info(`Refresh token updated for credId: ${item.credId}`);
    })
  );

  return responseParser
    .setBody({})
    .setMessage('Refresh token updated successfully')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
}
