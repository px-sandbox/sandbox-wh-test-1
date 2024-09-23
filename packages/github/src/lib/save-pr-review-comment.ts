import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { deleteProcessfromDdb } from 'rp';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

async function updatePrComments(
  pullId: string,
  repoId: string,
  orgId: string,
  reviewComments: number
): Promise<void> {
  logger.info({
    message: 'updatePrComments.info',
    data: { pullId, repoId, orgId, reviewComments },
  });
  await esClientObj.updateByQuery(
    Github.Enums.IndexName.GitPull,
    {
      script: {
        source: 'ctx._source.body.reviewComments = params.reviewComments',
        params: {
          reviewComments,
        },
      },
    },
    {
      query: {
        match: { id: pullId, repoId, orgId },
      },
    }
  );
}
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
    const prCommentsTotalQuery: Other.Type.HitBody = esb
      .requestBodySearch()
      .query(esb.matchQuery('body.pullId', data.body.pullId))
      .toJSON();
    const prcomment = await esClientObj.search(Github.Enums.IndexName.GitPRReviewComment, matchQry);
    const [formattedData] = await searchedDataFormator(prcomment);
    if (formattedData) {
      logger.info({
        message: 'savePRReviewComment.info LAST_ACTIONS_PERFORMED',
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

    logger.info({ message: 'savePRReviewComment.updatePrComment', requestId, resourceId });
    await updatePrComments(
      data.body.pullId,
      data.body.repoId,
      data.body.organizationId,
      prCommentsTotalQuery.hits.total.value
    );
  } catch (error: unknown) {
    logger.error({ message: 'savePRReviewComment.error', error, requestId, resourceId });
    throw error;
  }
}
