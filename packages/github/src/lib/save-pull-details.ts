import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';

export async function savePRDetails(data: Github.Type.PullRequest): Promise<void> {
  try {
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const userData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      data.body.action = [...formattedData.action, ...data.body.action];
      data.body.createdAt = formattedData.createdAt;
      data.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPull, data);
    logger.info('savePRDetails.successful');
  } catch (error: unknown) {
    logger.error('savePRDetails.error', {
      error,
    });
    throw error;
  }
}
