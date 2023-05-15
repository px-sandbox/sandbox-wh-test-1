import { ElasticClient, ddbDocClient, logger } from 'core';
import { Github } from 'pulse-abstraction';
import { ddbGlobalIndex } from 'pulse-abstraction/other/type';
import { region } from 'src/constant/config';
import { repoFormator } from 'src/util/repoFormator';
import { Table } from 'sst/node/table';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

export async function getRepoDetails(
  data: Github.ExternalType.Repository
): Promise<void> {
  try {
    const getParams = {
      TableName: Table.GithubMapping.tableName,
      Key: {
        IndexName: ddbGlobalIndex.GitHubIdIndex,
        KeyConditionExpression: 'githubId = :githubId',
        ExpressionAttributeValues: {
          ':githubId': `gh_repo_${data?.id}`,
        },
      },
    };
    const ddbRes = await ddbDocClient(region as string).send(
      new GetCommand(getParams)
    );
    logger.info(ddbRes);
    const result = await repoFormator(data, ddbRes.Item?.parentId);
    logger.info(result);
    if (!ddbRes.Item) {
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
    }
    await ElasticClient.saveOrUpdateDocument(
      Github.Enums.IndexName.GitRepo,
      result
    );
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
