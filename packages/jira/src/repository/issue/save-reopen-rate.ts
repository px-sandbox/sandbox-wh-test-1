// import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
// import { searchedDataFormator } from '../../util/response-formatter';
import { ParamsMapping } from '../../model/params-mapping';
import { mappingPrefixes } from '../../constant/config';

const esClientObj = new ElasticSearchClient({
  host: Config.OPENSEARCH_NODE,
  username: Config.OPENSEARCH_USERNAME ?? '',
  password: Config.OPENSEARCH_PASSWORD ?? '',
});
/**
 * Saves the details of a Jira issue to DynamoDB and Elasticsearch.
 * @param data The issue data to be saved.
 * @returns A Promise that resolves when the data has been saved successfully.
 * @throws An error if there was a problem saving the data.
 */
export async function saveReOpenRate(
  data: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody
): Promise<void> {
  try {
    // const updatedData = { ...data };
    const orgId = data.organizationId.split('org_')[1];
    await new DynamoDbDocClient().put(
      new ParamsMapping().preparePutParams(data._id, `${data.id}_${mappingPrefixes.org}_${orgId}`)
    );

    // const matchQry = esb
    //   .boolQuery()
    //   .must([
    //     esb.termsQuery('body.id', data.id),
    //     esb.termQuery('body.organizationId', data.organizationId),
    //   ])
    //   .toJSON();
    // const reOpenRateData = await esClientObj.searchWithEsb(
    //   Jira.Enums.IndexName.ReopenRate,
    //   matchQry
    // );

    // const [formattedData] = await searchedDataFormator(reOpenRateData);
    // if (formattedData) {
    //   updatedData.id = formattedData._id;
    // }
    const { _id, ...rest } = data;
    await esClientObj.putDocument(Jira.Enums.IndexName.ReopenRate, { id: _id, body: rest });
    logger.info('saveReopenRateDetails.successful');
  } catch (error: unknown) {
    logger.error(`saveReopenRateDetails.error,${error}`);
    throw error;
  }
}
