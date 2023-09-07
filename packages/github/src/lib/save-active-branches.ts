import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';

export async function saveActiveBranch(data: Github.Type.ActiveBranches): Promise<void> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    await esClientObj.putDocument(Github.Enums.IndexName.GitActiveBranches, data);
    logger.info('saveActiveBranchDetails.successful');
  } catch (error: unknown) {
    logger.error('saveActiveBranchDetails.error', {
      error,
    });
    throw error;
  }
}
