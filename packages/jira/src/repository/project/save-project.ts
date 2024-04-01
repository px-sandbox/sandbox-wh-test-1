import esb from 'elastic-builder';
// import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import {
  searchedDataFormator,
  searchedDataFormatorWithDeleted,
} from '../../util/response-formatter';
// import { ParamsMapping } from '../../model/params-mapping';
// import { mappingPrefixes } from '../../constant/config';

/**
 * Updates data in ElasticSearch index based on the provided matchField and matchValue.
 * @param esClientObj - The ElasticSearch client object.
 * @param indexName - The name of the ElasticSearch index.
 * @param matchField - The field to match against in the ElasticSearch index.
 * @param matchValue - The value to match against in the ElasticSearch index.
 * @param isDeleted - Optional flag to mark the data as deleted.
 * @returns Promise<void>
 */
async function updateData(
  esClientObj: ElasticSearchClient,
  indexName: string,
  matchField: string,
  matchValue: string,
  orgId: string,
  isDeleted = false
): Promise<void> {
  // Starting to soft delete project, sprint, boards and issues data from elastic search
  logger.info(`starting to soft delete ${indexName} data from elastic search`);
  const matchQry2 = esb
    .requestBodySearch()
    .query(
      esb.boolQuery().must([
        esb.termsQuery(matchField, matchValue),
        esb
          .boolQuery()
          .should([
            esb.termQuery('body.organizationId', orgId),
            esb.termQuery('body.organizationId.keyword', orgId),
          ])
          .minimumShouldMatch(1),
      ])
    )
    .toJSON();

  const data = await esClientObj.searchWithEsb(indexName, matchQry2);

  const formattedData = await searchedDataFormatorWithDeleted(data);

  if (formattedData?.length > 0) {
    if (isDeleted) {
      await esClientObj.bulkUpdate(indexName, formattedData);
    }

    logger.info(`save${indexName}Details.successful`);
  }
}

/**
 * Saves the project details to DynamoDB and Elasticsearch.
 * @param data The project details to be saved.
 * @returns A Promise that resolves when the project details have been saved successfully.
 * @throws An error if there was an issue saving the project details.
 */
export async function saveProjectDetails(data: Jira.Type.Project): Promise<void> {
  try {
    const updatedData = { ...data };
    // const orgId = data.body.organizationId.split('org_')[1];
    // await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(
    //   data.id,
    //   `${data.body.id}_${mappingPrefixes.org}_${orgId}`));
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', data.body.id),
        esb.termQuery('body.organizationId', data.body.organizationId),
      ])
      .toJSON();
    logger.info('saveProjectDetails.matchQry------->', { matchQry });
    const projectData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Project, matchQry);
    const [formattedData] = await searchedDataFormator(projectData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Project, updatedData);

    if (data.body.isDeleted) {
      await Promise.all([
        updateData(
          esClientObj,
          Jira.Enums.IndexName.Sprint,
          'body.projectId',
          data.body.id,
          data.body.organizationId,
          true
        ),
        updateData(
          esClientObj,
          Jira.Enums.IndexName.Issue,
          'body.projectId',
          data.body.id,
          data.body.organizationId,
          true
        ),
        updateData(
          esClientObj,
          Jira.Enums.IndexName.Board,
          'body.projectId',
          data.body.id,
          data.body.organizationId,
          true
        ),
      ]);
    }
    logger.info('saveProjectDetails.successful');
  } catch (error: unknown) {
    logger.error('saveProjectDetails.error', {
      error,
    });
    throw error;
  }
}
