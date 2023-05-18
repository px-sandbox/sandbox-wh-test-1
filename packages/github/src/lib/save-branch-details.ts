import { Github } from 'abstraction';
import { ElasticClient, find, logger, updateTable } from 'core';
import { branchFormator, updateBranchFormator } from 'src/util/branch-formatter';

export async function saveBranchDetails(data: Github.ExternalType.Api.Branch): Promise<void> {
  try {
    const record = await find(`gh_branch_${data.id}`);
    const result = await branchFormator(data, record?.parentId);
    if (!record) {
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
