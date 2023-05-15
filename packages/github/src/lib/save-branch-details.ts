import { ElasticClient, ddbDocClient, logger } from 'core';
import { Github } from 'abstraction';
import { ddbGlobalIndex } from 'abstraction/other/type';
import { region } from 'src/constant/config';
import { Table } from 'sst/node/table';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { branchFormator } from 'src/util/branch-formatter';

export async function saveBranchDetails(
  data: Github.ExternalType.Api.Branch
): Promise<void> {
  try {
    const getParams = {
      TableName: Table.GithubMapping.tableName,
      Key: {
        IndexName: ddbGlobalIndex.GitHubIdIndex,
        KeyConditionExpression: 'githubId = :githubId',
        ExpressionAttributeValues: {
          ':githubId': `gh_branch_${data?.id}`,
        },
      },
    };
    const ddbRes = await ddbDocClient(region as string).send(
      new GetCommand(getParams)
    );
    logger.info(ddbRes);
    const result = await branchFormator(data, ddbRes.Item?.parentId);
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
      Github.Enums.IndexName.GitBranch,
      result
    );
  } catch (error: unknown) {
    logger.error('getBranchDetails.error', {
      error,
    });
    throw error;
  }
}
