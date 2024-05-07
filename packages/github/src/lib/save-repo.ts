import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';
import { deleteProcessfromDdb } from 'rp';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();
export async function saveRepoDetails(data: Github.Type.RepoFormatter, processId?: string): Promise<void> {
  try {
    const updatedData = { ...data };
    const matchQry = esb.requestBodySearch().query(esb.matchQuery('body.id', data.body.id)).toJSON();
    const userData = await esClientObj.search(Github.Enums.IndexName.GitRepo, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      updatedData.body.action = [...formattedData.action, ...data.body.action];
      updatedData.body.createdAt = formattedData.createdAt;
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitRepo, updatedData);
    const lastAction = updatedData.body.action.slice(-1).pop();
    if (lastAction && lastAction.action !== 'deleted') {
      await sqsClient.sendMessage(updatedData, Queue.qGhAfterRepoSave.queueUrl);
    }
    logger.info('saveRepoDetails.successful');
    await deleteProcessfromDdb(processId);
  } catch (error: unknown) {
    logger.error(`saveRepoDetails.error, ${error}`);
    throw error;
  }
}
