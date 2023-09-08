import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { ParamsMapping } from '../model/params-mapping';

export async function saveActiveBranch(data: Github.Type.ActiveBranches): Promise<void> {
  try {
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));

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
