import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';

const esClientObj = ElasticSearchClient.getInstance();

export async function savePRReviewComment(data: Github.Type.PRReviewComment): Promise<void> {
  try {
    const { processId, ...updatedData } =  data ;
    const matchQry = esb.requestBodySearch().query(esb.matchQuery('body.id', data.body.id)).toJSON();
    const userData = await esClientObj.search(
      Github.Enums.IndexName.GitPRReviewComment,
      matchQry
    );
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.createdAt = formattedData.createdAt;
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPRReviewComment, updatedData);
    logger.info('savePRReviewComment.successful');
    if (processId) {
      logger.info('deleting_process_from_DDB', { processId });
      await deleteProcessfromDdb(processId);
    }
  } catch (error: unknown) {
    logger.error('savePRReviewComment.error', {
      error,
    });
    throw error;
  }
}
