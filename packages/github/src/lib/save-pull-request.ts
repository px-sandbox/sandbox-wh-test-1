import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { ParamsMapping } from '../model/params-mapping';
import { searchedDataFormator } from '../util/response-formatter';

export async function savePRDetails(data: Github.Type.PullRequest): Promise<void> {
  try {
    const updatedData = { ...data };
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const userData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, matchQry);
    const [formattedData] = await searchedDataFormator(userData);
    if (formattedData) {
      const [currentAction] = [...data.body.action];
      logger.info('LAST_ACTIONS_PERFORMED', formattedData.action);

      // check PR already exists or not
      if (currentAction.action === Github.Enums.PullRequest.Opened) {
        const { _id, ...updatedDataBody } = formattedData;
        updatedData.body = updatedDataBody;
        updatedData.id = _id;
      } else {
        updatedData.body.createdAt = formattedData.createdAt;
        updatedData.id = formattedData._id;
      }

      updatedData.body.action = [...formattedData.action, ...data.body.action];
    }
    await esClientObj.putDocument(Github.Enums.IndexName.GitPull, updatedData);
    logger.info('savePRDetails.successful');
  } catch (error: unknown) {
    logger.error('savePRDetails.error', {
      error,
    });
    throw error;
  }
}
