import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';

const esClientObj = ElasticSearchClient.getInstance();

export async function savePRDetails(data: Github.Type.PullRequest, reqCtx: Other.Type.RequestCtx, processId?: string): Promise<void> {
 const { requestId, resourceId } = reqCtx;
  try {
    const { ...updatedData } = data;
    const matchQry = esb
      .requestBodySearch()
      .query(esb.matchQuery('body.id', data.body.id))
      .toJSON();
    const userData = await esClientObj.search(Github.Enums.IndexName.GitPull, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info({ message: 'LAST_ACTIONS_PERFORMED', data: formattedData.action, requestId, resourceId});
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.createdAt = formattedData.createdAt;
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPull, updatedData);
    logger.info({ message: 'savePRDetails.successful', requestId, resourceId});
    await deleteProcessfromDdb(processId, { requestId, resourceId });
  } catch (error: unknown) {
    logger.error({ message: 'savePRDetails.error', error, requestId, resourceId});
    throw error;
  }
}
