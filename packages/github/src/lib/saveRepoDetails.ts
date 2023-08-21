import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../util/responseFormatter';
import { ParamsMapping } from '../model/paramsMapping';

export async function saveRepoDetails(data: Github.Type.RepoFormatter): Promise<void> {
  try {
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const userData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitRepo, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);
      data.body.action = [...formattedData.action, ...data.body.action];
      data.body.createdAt = formattedData.createdAt;
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitRepo, data);
    const lastAction = data.body.action.slice(-1).pop();
    if (lastAction && lastAction.action !== 'deleted') {
      await new SQSClient().sendMessage(data, Queue.gh_after_repo_save.queueUrl);
    }
    logger.info('saveRepoDetails.successful');
  } catch (error: unknown) {
    logger.error('saveRepoDetails.error', {
      error,
    });
    throw error;
  }
}
