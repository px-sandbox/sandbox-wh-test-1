import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { deleteProcessfromDdb } from 'rp';

const esClientObj = ElasticSearchClient.getInstance();
export async function savePushDetails(data: Github.Type.Push, processId?: string): Promise<void> {
  try {
    const updatedData = { ...data };
    const matchQry = esb
      .requestBodySearch()
      .query(esb.matchQuery('body.id', data.body.id))
      .toJSON();
    const pushData = await esClientObj.search(Github.Enums.IndexName.GitPush, matchQry);
    const [formattedData] = await searchedDataFormator(pushData);
    if (formattedData) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      updatedData.body.action = [...formattedData.action, ...data.body.action];
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPush, updatedData);
    logger.info('savePushDetails.successful');
    await deleteProcessfromDdb(processId);
  } catch (error: unknown) {
    logger.error('savePushDetails.error', {
      error,
    });
    throw error;
  }
}
