import { DynamoDbDocClient } from '@pulse/dynamodb';
import { logger } from 'core';
import { Table } from 'sst/node/table';
import { getTokens } from '../lib/get-token';
import { JiraCredsMapping } from '../model/prepare-creds-params';

// get credIds from dynamoDB
// for each credId, call getToken
// update the refresh token in dynamoDB
export async function updateRefreshToken(): Promise<void> {
  logger.info(`Get refresh token invoked at: ${new Date().toISOString()}`);
  const _ddbClient = new DynamoDbDocClient();

  const data = (await _ddbClient.scan({
    TableName: Table.jiraCreds.tableName,
  })) as Array<{ id: string; refresh_token: string }>;

  const ddbResp = data.map((item): { credId: string; refreshToken: string } => ({
    credId: item.id,
    refreshToken: item.refresh_token,
  }));
  if (ddbResp.length === 0) {
    throw new Error('No refresh token found');
  }
  await Promise.all([
    ddbResp.map(async (item) => {
      logger.info(`Updating Refresh token updated for credId...: ${item.credId}`);
      const newRefreshToken = await getTokens(item.refreshToken);
      await _ddbClient.put(new JiraCredsMapping().preparePutParams(item.credId, newRefreshToken));
      logger.info(`Refresh token updated for credId: ${item.credId}`);
    }),
  ]);
}
