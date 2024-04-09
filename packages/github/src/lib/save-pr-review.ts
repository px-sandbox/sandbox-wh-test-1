import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';

const esClientObj = ElasticSearchClient.getInstance();

export async function savePRReview(data: Github.Type.PRReview): Promise<void> {
  try {
    const {processId, ...updatedData} = data;
    const matchQry = esb.requestBodySearch().query(esb.matchQuery('body.id', data.body.id)).toJSON();
    const userData = await esClientObj.search(Github.Enums.IndexName.GitPRReview, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.submittedAt = formattedData.submittedAt;
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPRReview, updatedData);
    logger.info('savePRReview.successful');
    if (processId) {
      await deleteProcessfromDdb(processId);
    }
  } catch (error: unknown) {
    logger.error('savePRReview.error', {
      error,
    });
    throw error;
  }
}
