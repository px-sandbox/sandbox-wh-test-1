import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from 'rp';
import { searchedDataFormator } from '../../util/response-formatter';
/**
 * Saves the details of a Jira issue to DynamoDB and Elasticsearch.
 * @param data The issue data to be saved.
 * @returns A Promise that resolves when the data has been saved successfully.
 * @throws An error if there was a problem saving the data.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveCycleTime(
  data: Jira.Type.CycleTime,
  reqCtx: Other.Type.RequestCtx,
  processId?: string
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const updatedData = { ...data };
    const matchQry = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.id', data.body.id),
            esb.termQuery('body.organizationId.keyword', data.body.organizationId),
          ])
      )
      .toJSON();
    const cycleTimeData = await esClientObj.search(Jira.Enums.IndexName.CycleTime, matchQry);
    const [formattedData] = await searchedDataFormator(cycleTimeData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.CycleTime, updatedData);
    logger.info({ requestId, resourceId, message: 'saveCycleTimeDetails.successful' });
    await deleteProcessfromDdb(processId, reqCtx);
  } catch (error: unknown) {
    logger.error({ requestId, resourceId, message: `saveCycleTimeDetails.error: ${error}` });
    throw error;
  }
}
