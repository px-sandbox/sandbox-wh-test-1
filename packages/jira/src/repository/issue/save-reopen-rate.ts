import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../../util/response-formatter';

/**
 * Saves the details of a Jira issue to DynamoDB and Elasticsearch.
 * @param data The issue data to be saved.
 * @returns A Promise that resolves when the data has been saved successfully.
 * @throws An error if there was a problem saving the data.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveReOpenRate(data: Jira.Type.Issue): Promise<void> {
  try {
    const updatedData = { ...data };
    const matchQry = esb
      .requestBodySearch().query(esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', data.body.id),
        esb.termQuery('body.organizationId', data.body.organizationId),
      ]))
      .toJSON();
    const reOpenRateData = await esClientObj.search(
      Jira.Enums.IndexName.ReopenRate,
      matchQry
    );

    const [formattedData] = await searchedDataFormator(reOpenRateData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.ReopenRate, updatedData);
    logger.info('saveReopenRateDetails.successful');
  } catch (error: unknown) {
    logger.error(`saveReopenRateDetails.error,${error}`);
    throw error;
  }
}
