import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { deleteProcessfromDdb } from 'rp';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

export async function savePRReviewComment(
  data: Github.Type.PRReviewComment,
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
    const userData = await esClientObj.search(Github.Enums.IndexName.GitPRReviewComment, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info({
        message: 'LAST_ACTIONS_PERFORMED',
        data: formattedData.action,
        requestId,
        resourceId,
      });
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.createdAt = formattedData.createdAt;
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPRReviewComment, updatedData);
    logger.info({ message: 'savePRReviewComment.successful', requestId, resourceId });
    await deleteProcessfromDdb(processId, { requestId, resourceId });
  } catch (error: unknown) {
    logger.error({ message: 'savePRReviewComment.error', error, requestId, resourceId });
    throw error;
  }
}
