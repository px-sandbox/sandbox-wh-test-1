import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';

export async function savePullRequestReviewComment(
  data: Github.Type.PullRequestReviewComment
): Promise<void> {
  try {
    await new DynamoDbDocClient(Config.STAGE).put(
      new ParamsMapping().preparePutParams(data.id, data.body.id)
    );
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const userData = await esClientObj.searchWithEsb(
      Github.Enums.IndexName.GitPRReviewComment,
      matchQry
    );
    const formattedData = await searchedDataFormator(userData);
    if (formattedData[0]) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData[0].action);
      data.body.action = [...formattedData[0].action, ...data.body.action];
      data.body.createdAt = formattedData[0].createdAt;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPRReviewComment, data);
    logger.info('savePullRequestReviewComment.successful');
  } catch (error: unknown) {
    logger.error('savePullRequestReviewComment.error', {
      error,
    });
    throw error;
  }
}
