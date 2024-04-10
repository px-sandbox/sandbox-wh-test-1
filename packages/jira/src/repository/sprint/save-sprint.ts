import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { searchedDataFormator } from '../../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';

/**
 * Saves the details of a Jira sprint to DynamoDB and Elasticsearch.
 * @param data The sprint data to be saved.
 * @returns A Promise that resolves when the sprint details have been saved.
 * @throws Throws an error if there was an issue saving the sprint details.
 */

const esClientObj = ElasticSearchClient.getInstance();

export async function saveSprintDetails(data: Jira.Type.Sprint,processId?:string): Promise<void> {
  try {
    const { ...updatedData } = data;
    
    const matchQry = esb
      .requestBodySearch().query(esb
        .boolQuery()
        .must([
          esb.termsQuery('body.id', data.body.id),
          esb.termQuery('body.organizationId.keyword', data.body.organizationId),
        ])).toJSON();
    const sprintData = await esClientObj.search(Jira.Enums.IndexName.Sprint, matchQry);
    const [formattedData] = await searchedDataFormator(sprintData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Sprint, updatedData);
    logger.info('saveSprintDetails.successful');
    if (processId) {
      logger.info('deleting_process_from_DDB', { processId });
      await deleteProcessfromDdb(processId);
    }
  } catch (error: unknown) {
    logger.error('saveSprintDetails.error', {
      error,
    });
    throw error;
  }
}
