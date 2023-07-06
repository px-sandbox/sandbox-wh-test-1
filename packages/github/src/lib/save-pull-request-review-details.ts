import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';

export async function savePRReview(data: Github.Type.PRReview): Promise<void> {
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
    const userData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPRReview, matchQry);
    const formattedData = await searchedDataFormator(userData);
    if (formattedData[0]) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData[0].action);
      data.body.action = [...formattedData[0].action, ...data.body.action];
      data.body.submittedAt = formattedData[0].submittedAt;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPRReview, data);
    logger.info('savePRReview.successful');
  } catch (error: unknown) {
    logger.error('savePRReview.error', {
      error,
    });
    throw error;
  }
}
