import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';

export async function saveRepoDetails(data: Github.Type.RepoFormatter): Promise<void> {
  try {
    await new DynamoDbDocClient(Config.STAGE).put(
      new ParamsMapping().preparePutParams(data.id, data.body.id)
    );
    await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    }).putDocument(Github.Enums.IndexName.GitRepo, data);
    await new SQSClient().sendMessage(data, Queue.gh_after_repo_save.queueUrl);
    logger.info('saveRepoDetails.successful');
  } catch (error: unknown) {
    logger.error('saveRepoDetails.error', {
      error,
    });
    throw error;
  }
}
