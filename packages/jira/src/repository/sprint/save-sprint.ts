import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../../util/response-formatter';
import { ParamsMapping } from '../../model/params-mapping';
import { mappingPrefixes } from '../../constant/config';

/**
 * Saves the details of a Jira sprint to DynamoDB and Elasticsearch.
 * @param data The sprint data to be saved.
 * @returns A Promise that resolves when the sprint details have been saved.
 * @throws Throws an error if there was an issue saving the sprint details.
 */
export async function saveSprintDetails(data: Jira.Type.Sprint): Promise<void> {
  try {
    const updatedData = { ...data };
    const orgId = data.body.organizationId.split('org_')[1];
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(
      data.id,
      `${data.body.id}_${mappingPrefixes.org}_${orgId}`));
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry =
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.id', data.body.id),
          esb.termQuery('body.organizationId.keyword', data.body.organizationId),
        ]).toJSON();
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
