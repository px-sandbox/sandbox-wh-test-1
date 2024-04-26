import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from '../../util/delete-process';
import { searchedDataFormator } from '../../util/response-formatter';

/**
 * Saves the details of a Jira issue to DynamoDB and Elasticsearch.
 * @param data The issue data to be saved.
 * @returns A Promise that resolves when the data has been saved successfully.
 * @throws An error if there was a problem saving the data.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveReOpenRate(
  data: Jira.Type.Issue,
  reqCtx: Other.Type.RequestCtx,
  processId?: string
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const { ...updatedData } = data;
    const matchQry = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.id', data.body.id),
            esb.termQuery('body.organizationId', data.body.organizationId),
          ])
      )
      .toJSON();
    const reOpenRateData = await esClientObj.search(Jira.Enums.IndexName.ReopenRate, matchQry);

    const [formattedData] = await searchedDataFormator(reOpenRateData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.ReopenRate, updatedData);
    logger.info({ requestId, resourceId, message: 'saveReopenRateDetails.successful' });
    await deleteProcessfromDdb(processId);
  } catch (error: unknown) {
    logger.error({ requestId, resourceId, message: `saveReopenRateDetails.error,${error}` });
    throw error;
  }
}
