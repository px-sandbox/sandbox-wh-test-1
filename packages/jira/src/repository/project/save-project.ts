import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../../util/response-formatter';
import { ParamsMapping } from '../../model/params-mapping';

/**
 * Saves the project details to DynamoDB and Elasticsearch.
 * @param data The project details to be saved.
 * @returns A Promise that resolves when the project details have been saved successfully.
 * @throws An error if there was an issue saving the project details.
 */
export async function saveProjectDetails(data: Jira.Type.Project): Promise<void> {
  try {
    const updatedData = { ...data };
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    logger.info('saveProjectDetails.matchQry------->', { matchQry });
    const projectData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Project, matchQry);
    const [formattedData] = await searchedDataFormator(projectData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Project, updatedData);
    logger.info('saveProjectDetails.successful');
  } catch (error: unknown) {
    logger.error('saveProjectDetails.error', {
      error,
    });
    throw error;
  }
}
