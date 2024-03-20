import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();

export async function saveBranchDetails(data: Github.Type.Branch): Promise<void> {
  try {
    const updatedData = { ...data };
    const matchQry = esb.requestBodySearch().query(esb.matchQuery('body.id', data.body.id)).toJSON();
    const userData = await esClientObj.search(Github.Enums.IndexName.GitBranch, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.createdAt = formattedData.createdAt;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitBranch, updatedData);
    logger.info('saveBranchDetails.successful');
  } catch (error: unknown) {
    logger.error('saveBranchDetails.error', {
      error,
    });
    throw error;
  }
}
