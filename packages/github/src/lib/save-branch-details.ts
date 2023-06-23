import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';

export async function saveBranchDetails(data: Github.Type.Branch): Promise<void> {
  try {
    if (data) {
      logger.info('---NEW_RECORD_FOUND---');
      await new DynamoDbDocClient(Config.STAGE).put(
        new ParamsMapping().preparePutParams(data.id, data.body.id)
      );
      await new ElasticSearchClient({
        host: Config.OPENSEARCH_NODE,
        username: Config.OPENSEARCH_USERNAME ?? '',
        password: Config.OPENSEARCH_PASSWORD ?? '',
      }).putDocument(Github.Enums.IndexName.GitBranch, data);
    }
  } catch (error: unknown) {
    logger.error('getBranchDetails.error', {
      error,
    });
    throw error;
  }
}
