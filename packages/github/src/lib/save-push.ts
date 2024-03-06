import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../util/response-formatter';

export async function savePushDetails(data: Github.Type.Push): Promise<void> {
  try {
    const updatedData = { ...data };
    const esClientObj = new ElasticSearchClient({
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
      updatedData.body.action = [...formattedData.action, ...data.body.action];
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPush, updatedData);
    logger.info('savePushDetails.successful');
  } catch (error: unknown) {
    logger.error('savePushDetails.error', {
      error,
    });
    throw error;
  }
}
