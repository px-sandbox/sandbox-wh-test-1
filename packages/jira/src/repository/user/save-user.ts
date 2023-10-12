import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { ParamsMapping } from '../../model/params-mapping';

/**
 * Saves the user details to DynamoDB and Elasticsearch.
 * @param data The user details to be saved.
 * @returns A Promise that resolves when the user details have been saved successfully.
 * @throws An error if there was an issue saving the user details.
 */
export async function saveUserDetails(data: Jira.Type.User): Promise<void> {
  try {
    const updatedData = { ...data };
    logger.info('saveUserDetails.invoked');
    await new DynamoDbDocClient().put(new ParamsMapping()
      .preparePutParams(data.id, data.body.id, data.body.organizationId));
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    logger.info('saveUserDetails.matchQry------->', { matchQry });
    const userData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Users, matchQry);
    const [formattedData] = await searchedDataFormatorWithDeleted(userData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Users, updatedData);
    logger.info('saveUserDetails.successful');
  } catch (error: unknown) {
    logger.error('saveUserDetails.error', {
      error,
    });
    throw error;
  }
}
