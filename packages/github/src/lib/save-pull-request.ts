import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();

export async function savePRDetails(data: Github.Type.PullRequest): Promise<void> {
  try {
    const updatedData = { ...data };
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const userData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.createdAt = formattedData.createdAt;
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPull, updatedData);
    logger.info('savePRDetails.successful');
  } catch (error: unknown) {
    logger.error('savePRDetails.error', {
      error,
    });
    throw error;
  }
}
