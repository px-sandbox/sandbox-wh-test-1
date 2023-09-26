import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../util/response-formatter';
import { ParamsMapping } from '../model/params-mapping';

export async function saveSprintDetails(data: Jira.Type.Sprint): Promise<void> {
  try {
    const updatedData = { ...data };
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    const sprintData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Sprint, matchQry);
    const [formattedData] = await searchedDataFormator(sprintData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Sprint, updatedData);
    logger.info('saveSprintDetails.successful');
  } catch (error: unknown) {
    logger.error('saveSprintDetails.error', {
      error,
    });
    throw error;
  }
}
