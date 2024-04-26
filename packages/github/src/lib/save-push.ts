import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';

const esClientObj = ElasticSearchClient.getInstance();
export async function savePushDetails(data: Github.Type.Push, reqCtx: Other.Type.RequestCtx, processId?: string): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const updatedData = { ...data };
    const matchQry = esb
      .requestBodySearch()
      .query(esb.matchQuery('body.id', data.body.id))
      .toJSON();
    const pushData = await esClientObj.search(Github.Enums.IndexName.GitPush, matchQry);
    const [formattedData] = await searchedDataFormator(pushData);
    if (formattedData) {
      logger.info({ message: 'LAST_ACTIONS_PERFORMED', data: formattedData.action, requestId , resourceId});
      updatedData.body.action = [...formattedData.action, ...data.body.action];
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPush, updatedData);
    logger.info({ message: 'savePushDetails.successful', requestId, resourceId});
    await deleteProcessfromDdb(processId, {requestId, resourceId});
  } catch (error: unknown) {
    logger.error({message: 'savePushDetails.error', 
      error,
      requestId,
      resourceId
    });
    throw error;
  }
}
