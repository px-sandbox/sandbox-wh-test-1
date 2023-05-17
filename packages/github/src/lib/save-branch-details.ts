import { ElasticClient, ddbDocClient, find, logger, updateTable } from 'core';
import { Github } from 'abstraction';
import { ddbGlobalIndex } from 'abstraction/other/type';
import { region } from 'src/constant/config';
import { Table } from 'sst/node/table';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { branchFormator } from 'src/util/branch-formatter';

export async function saveBranchDetails(
  data: Github.ExternalType.Api.Branch
): Promise<void> {
  try {
    const record = await find(`gh_branch_${data.id}`);
    const result = await branchFormator(data, record?.parentId);
    if (!record) {
      logger.info('---NEW_RECORD_FOUND---');
      await updateTable(result);
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
