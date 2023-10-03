import { DynamoDbDocClient } from '@pulse/dynamodb';
import { logger } from 'core';
import { getTokens } from 'src/lib/getToken';
import { JiraCredsMapping } from 'src/model/prepare-creds-params';
import { Table } from 'sst/node/table';

async function getCredIdsAndToken(): Promise<{ credId: string; refreshToken: string }[]> {
  const _ddbClient = await new DynamoDbDocClient().scan({
    TableName: Table.jiraCreds.tableName,
  });
  const data = _ddbClient as { id: string; refresh_token: string }[];
  const ddbResp = data.map((item): { credId: string; refreshToken: string } => {
    return {
      credId: item.id,
      refreshToken: item.refresh_token,
    };
  });
  return ddbResp;
}
// get credIds from dynamoDB
// for each credId, call getToken
// update the refresh token in dynamoDB
export async function updateRefreshToken(): Promise<void> {
  logger.info(`Get refresh token invoked at: ${new Date().toISOString()}`);
  const tokenAndId = await getCredIdsAndToken();
  if (tokenAndId.length === 0) {
    throw new Error('No refresh token found');
  }
  await Promise.all([
    tokenAndId.map(async (item) => {
      const newRefreshToken = await getTokens(item.refreshToken);
      await new DynamoDbDocClient().put(
        new JiraCredsMapping().preparePutParams(item.credId, newRefreshToken)
      );
      logger.info(`Refresh token updated for credId: ${item.credId}`);
    }),
  ]);
}
