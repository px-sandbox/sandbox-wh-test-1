import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { deleteProcessfromDdb } from 'rp';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

export async function saveBranchDetails(
  data: Github.Type.Branch,
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
    const branch = (await esClientObj.search(
      Github.Enums.IndexName.GitBranch,
      matchQry
    )) as Other.Type.ElasticSearchResponse;
    const [formattedData] = await searchedDataFormator(branch);
    if (formattedData) {
      logger.info({
        message: 'saveBranchDetails.info LAST_ACTIONS_PERFORMED',
        data: formattedData.action,
        requestId,
        resourceId,
      });
      updatedData.body.action = [
        ...(formattedData.action as Github.Type.actions),
        ...data.body.action,
      ];
      updatedData.body.createdAt = formattedData.createdAt as string;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitBranch, updatedData);
    logger.info({ message: 'saveBranchDetails.successful', requestId, resourceId });
    await deleteProcessfromDdb(processId, { requestId, resourceId });
  } catch (error: unknown) {
    logger.error({
      message: 'saveBranchDetails.error',
      error,
      requestId,
      resourceId,
    });
    throw error;
  }
}
