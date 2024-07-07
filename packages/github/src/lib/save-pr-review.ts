import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { deleteProcessfromDdb } from 'rp';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

export async function savePRReview(
  data: Github.Type.PRReview,
  reqCtx: Other.Type.RequestCtx,
  processId?: string
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const updatedData = { ...data };
    const matchQry = esb
      .requestBodySearch()
      .query(esb.matchQuery('body.id', data.body.id))
      .toJSON();
    const userData = await esClientObj.search(Github.Enums.IndexName.GitPRReview, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info({
        message: 'savePRReview.info LAST_ACTIONS_PERFORMED',
        data: formattedData.action,
        requestId,
        resourceId,
      });
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.submittedAt = formattedData.submittedAt;
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPRReview, updatedData);
    logger.info({ message: 'savePRReview.successful', requestId, resourceId });
    await deleteProcessfromDdb(processId, { requestId, resourceId });
  } catch (error: unknown) {
    logger.error({ message: 'savePRReview.error', error, requestId, resourceId });
    throw error;
  }
}
