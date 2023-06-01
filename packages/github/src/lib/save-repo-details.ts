import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { region } from 'src/constant/config';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';

export async function saveRepoDetails(data: Github.Type.RepoFormatter): Promise<void> {
  try {
    if (data) {
      logger.info('---NEW_RECORD_FOUND---');
      await new DynamoDbDocClient(region, Config.STAGE).put(
        new ParamsMapping().preparePutParams(data.id, data.body.id)
      );
      await new ElasticSearchClient({
        host: Config.OPENSEARCH_NODE,
        username: Config.OPENSEARCH_USERNAME ?? '',
        password: Config.OPENSEARCH_PASSWORD ?? '',
      }).putDocument(Github.Enums.IndexName.GitRepo, data);
    }
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
