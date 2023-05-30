import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import {
  OPENSEARCH_NODE,
  OPENSEARCH_PASSWORD,
  OPENSEARCH_USERNAME,
  region,
} from 'src/constant/config';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';

export async function saveUserDetails(data: Github.Type.User): Promise<void> {
  try {
    if (data) {
      logger.info('---NEW_RECORD_FOUND---');
      await new DynamoDbDocClient(region, Config.STAGE).put(
        new ParamsMapping().preparePutParams(data.id, data.body.id)
      );
    }
    await new ElasticSearchClient({
      host: OPENSEARCH_NODE,
      username: OPENSEARCH_USERNAME ?? '',
      password: OPENSEARCH_PASSWORD ?? '',
    }).putDocument(Github.Enums.IndexName.GitUsers, data);
  } catch (error: unknown) {
    logger.error('getUserDetails.error', {
      error,
    });
    throw error;
  }
}
