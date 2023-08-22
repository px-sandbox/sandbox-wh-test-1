import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { ParamsMapping } from '../model/params-mapping';
import { searchedDataFormator } from '../util/response-formatter';

export async function savePushDetails(data: Github.Type.Push): Promise<void> {
  try {
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const pushData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPush, matchQry);
    const [formattedData] = await searchedDataFormator(pushData);
    if (formattedData) {
      // TODO: remove actions from push
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      data.body.action = [...formattedData.action, ...data.body.action];
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPush, data);
    logger.info('savePushDetails.successful');
  } catch (error: unknown) {
    logger.error('savePushDetails.error', {
      error,
    });
    throw error;
  }
}
