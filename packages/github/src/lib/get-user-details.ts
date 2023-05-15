import { ElasticClient, ddbDocClient, logger } from 'core';
import { Github } from 'pulse-abstraction';
import { ddbGlobalIndex } from 'pulse-abstraction/other/type';
import { region } from 'src/constant/config';
import { Table } from 'sst/node/table';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { userFormator } from 'src/util/user-formatter';

export async function getUserDetails(
  data: Github.ExternalType.User
): Promise<void> {
  try {
    const getParams = {
      TableName: Table.GithubMapping.tableName,
      Key: {
        IndexName: ddbGlobalIndex.GitHubIdIndex,
        KeyConditionExpression: 'githubId = :githubId',
        ExpressionAttributeValues: {
          ':githubId': `gh_user_${data?.id}`,
        },
      },
    };
    const ddbRes = await ddbDocClient(region as string).send(
      new GetCommand(getParams)
    );
    logger.info(ddbRes);
    const result = await userFormator(data, ddbRes.Item?.parentId);
    if (!result) {
      logger.info('---NEW_RECORD_FOUND---');
      const putParams = {
        TableName: Table.GithubMapping.tableName,
        Item: {
          parentId: result.id,
          githubId: result.body.id,
        },
      };
      logger.info('DYNAMODB_PUT_PARAM_DATA', { data: putParams });
      await ddbDocClient(region as string).send(new PutCommand(putParams));
      logger.info('---NEW_RECORD_FOUND---');
    }
    await ElasticClient.saveOrUpdateDocument(
      Github.Enums.IndexName.GitUsers,
      result
    );
  } catch (error: unknown) {
    logger.error('getUserDetails.error', {
      error,
    });
    throw error;
  }
}
