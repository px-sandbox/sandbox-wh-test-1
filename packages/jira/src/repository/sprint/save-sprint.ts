import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from '../../util/delete-process';
import { searchedDataFormator } from '../../util/response-formatter';
import { deleteProcessfromDdb } from 'rp';

/**
 * Saves the details of a Jira sprint to DynamoDB and Elasticsearch.
 * @param data The sprint data to be saved.
 * @returns A Promise that resolves when the sprint details have been saved.
 * @throws Throws an error if there was an issue saving the sprint details.
 */

const esClientObj = ElasticSearchClient.getInstance();

export async function saveSprintDetails(
  data: Jira.Type.Sprint,
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
    const sprintData = await esClientObj.search(Jira.Enums.IndexName.Sprint, matchQry);
    const [formattedData] = await searchedDataFormator(sprintData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Sprint, updatedData);
    logger.info({ requestId, resourceId, message: 'saveSprintDetails.successful' });
    await deleteProcessfromDdb(processId);
  } catch (error: unknown) {
    logger.error({ requestId, resourceId, message: 'saveSprintDetails.error', error });
    throw error;
  }
}
