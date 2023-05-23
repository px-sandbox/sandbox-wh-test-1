import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'model/params-mapping';
import { region } from 'src/constant/config';
import { branchFormator } from 'src/util/branch-formatter';
import { Config } from 'sst/node/config';

export async function saveBranchDetails(data: Github.ExternalType.Api.Branch): Promise<void> {
  const branchId = `gh_branch_${data.id}`;
  try {
    const { Items } = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(branchId)
    );
    const result = await branchFormator(data, Items?.parentId);
    if (!Items) {
      logger.info('---NEW_RECORD_FOUND---');
      await updateTable(result);
      await ElasticClient.saveOrUpdateDocument(Github.Enums.IndexName.GitBranch, result);
    } else {
      logger.info('---UPDATE BRANCH RECORD---');
      await ElasticClient.partialUpdateDocument(Github.Enums.IndexName.GitBranch, result);
    }
  } catch (error: unknown) {
    logger.error('getBranchDetails.error', {
      error,
    });
    throw error;
  }
}
