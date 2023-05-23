import { Github } from 'abstraction';
import { ElasticClient, find, logger, updateTable } from 'core';
import { userFormator } from 'src/util/user-formatter';
import { Table } from 'sst/node/table';
import { QueryCommandInput } from '@aws-sdk/lib-dynamodb';
export async function saveUserDetails(data: Github.ExternalType.Api.User): Promise<void> {
  try {
    const githubId = `gh_user_${data?.id}`;
    const getParams: QueryCommandInput = {
      TableName: Table.GithubMapping.tableName,
      IndexName: 'githubIdIndex',
      KeyConditionExpression: 'githubId = :githubId',
      ExpressionAttributeValues: { ':githubId': githubId },
    };
    const { Items } = await find(getParams);
    const result = await userFormator(data, Items?.parentId);
    if (!Items) {
      logger.info('---NEW_RECORD_FOUND---');
      await updateTable(result);
      await ElasticClient.saveOrUpdateDocument(Github.Enums.IndexName.GitUsers, result);
    } else {
      logger.info('---UPDATE USER RECORD---');
      await ElasticClient.partialUpdateDocument(Github.Enums.IndexName.GitUsers, result);
    }
  } catch (error: unknown) {
    logger.error('getUserDetails.error', {
      error,
    });
    throw error;
  }
}
