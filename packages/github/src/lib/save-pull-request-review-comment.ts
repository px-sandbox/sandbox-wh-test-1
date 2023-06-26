import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';

export async function savePullRequestReviewComment(
  data: Github.Type.PullRequestReviewComment
): Promise<void> {
  try {
    await new DynamoDbDocClient(Config.STAGE).put(
      new ParamsMapping().preparePutParams(data.id, data.body.id)
    );
    await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    }).putDocument(Github.Enums.IndexName.GitPRReviewComment, data);
    logger.info('savePullRequestReviewComment.successful');
  } catch (error: unknown) {
    logger.error('savePullRequestReviewComment.error', {
      error,
    });
    throw error;
  }
}
