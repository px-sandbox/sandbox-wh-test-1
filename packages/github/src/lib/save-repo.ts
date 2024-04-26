import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();
export async function saveRepoDetails(data: Github.Type.RepoFormatter, reqCtx: Other.Type.RequestCtx, processId?: string): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const updatedData = { ...data };
    const matchQry = esb.requestBodySearch().query(esb.matchQuery('body.id', data.body.id)).toJSON();
    const userData = await esClientObj.search(Github.Enums.IndexName.GitRepo, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info({ message: 'LAST_ACTIONS_PERFORMED', data: formattedData.action, requestId, resourceId });
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.createdAt = formattedData.createdAt;
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitRepo, updatedData);
    const lastAction = updatedData.body.action.slice(-1).pop();
    if (lastAction && lastAction.action !== 'deleted') {
      await sqsClient.sendMessage(updatedData, Queue.qGhAfterRepoSave.queueUrl, reqCtx);
    }
    logger.info({ message: 'saveRepoDetails.successful' , requestId, resourceId});
    await deleteProcessfromDdb(processId,{requestId, resourceId});
  } catch (error: unknown) {
    logger.error({ message: "saveRepoDetails.error", error, requestId, resourceId});
    throw error;
  }
}
