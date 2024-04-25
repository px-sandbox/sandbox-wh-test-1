/* eslint-disable @typescript-eslint/no-explicit-any */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { Config } from 'sst/node/config';
import { Table } from 'sst/node/table';
import { logger } from 'core';
import async from 'async';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import esb from 'elastic-builder';
import moment from 'moment';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { searchedDataFormatorWithDeleted } from '../util/response-formatter';

// initializing elastic search client
const esClientObj = ElasticSearchClient.getInstance();
const DynamoDbDocClientObj = DynamoDbDocClient.getInstance();

/**
 * Creates a delete query object based on the provided data.
 * @param data - The data object containing the projectId and organizationId.
 * @returns The delete query object.
 */
function createDeleteQuery(data: { projectId: string; organizationId: string }): object {
  return esb
    .boolQuery()
    .must([
      esb
        .boolQuery()
        .should([
          esb.termQuery('body.id', data.projectId),
          esb.termQuery('body.projectId', data.projectId),
        ])
        .minimumShouldMatch(1),
      esb
        .boolQuery()
        .should([
          esb.termQuery('body.organizationId', data.organizationId),
          esb.termQuery('body.organizationId.keyword', data.organizationId),
        ])
        .minimumShouldMatch(1),
    ])
    .toJSON();
}
/**
 * Deletes project data from Elasticsearch if project was soft-deleted more than 90 days ago.
 * @param result The search result containing the project IDs to delete.
 * @returns A Promise that resolves when the deletion is complete.
 */
async function deleteProjectData(
  result: (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[],
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  try {
    logger.info({
      ...reqCtx,
      message: 'starting to delete project, sprint, boards and issues data from elastic search',
    });
    const projectData = result?.map((hit) => ({
      projectId: hit.id,
      organizationId: hit.organizationId,
    }));

    const indexArr = [
      Jira.Enums.IndexName.Project,
      Jira.Enums.IndexName.Issue,
      Jira.Enums.IndexName.Sprint,
      Jira.Enums.IndexName.Board,
    ];
    let deleteQuery = {};

    const deletePromises = projectData.map((data) => {
      deleteQuery = createDeleteQuery(data);

      // deleting all data from ES for project and related sprint, boards and issues
      return esClientObj.deleteByQuery(indexArr, deleteQuery);
    });

    await Promise.all(deletePromises);
    logger.info({
      ...reqCtx,
      message: 'deleted project, sprint, boards and issues data from elastic search',
    });
  } catch (err) {
    logger.error({
      ...reqCtx,
      message: 'error while deleting project data from elastic search',
      error: err,
    });
    throw err;
  }
}

/**
 * Deletes projectId entry from DynamoDB.
 * @param result - The search result from DD.
 * @returns A Promise that resolves when all projects have been deleted from DynamoDB.
 */
async function deleteProjectfromDD(
  result: (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[],
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  try {
    logger.info({ ...reqCtx, message: 'starting to delete project from dynamo db' });

    const parentIds = result?.map((hit) => hit._id);

    // Deleting from dynamo DB in batches of 20
    await async.eachLimit(parentIds, 50, async (parentId: any) => {
      const params = {
        TableName: Table.jiraMapping.tableName,
        Key: {
          parentId,
        },
      };

      try {
        await DynamoDbDocClientObj.delete(params);

        logger.info({
          ...reqCtx,
          message: `Entry with parentId ${parentId} deleted from dynamo db`,
        });
      } catch (error) {
        logger.error({
          ...reqCtx,
          message: `Error while deleting entry with parentId ${parentId} from dynamo DB`,
          error,
        });
        throw error;
      }
    });
  } catch (err) {
    logger.error({ ...reqCtx, message: 'Error while preparing delete requests', error: err });
    throw err;
  }
}

/**
 * Creates a request body search query for searching deleted projects.
 * @param dateToCompare - The date to compare against the 'deletedAt' field.
 * @returns The request body search query as a JSON object.
 */
function createRequestBodySearchQuery(dateToCompare: moment.Moment): object {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.isDeleted', true),
          esb.rangeQuery('body.deletedAt').lte(dateToCompare.toISOString()),
        ])
    )
    .toJSON();
}

/**
 * Deletes projects that have been marked as deleted and have been deleted for more than 90 days.
 * Deletes the corresponding entries from Elasticsearch and DynamoDB.
 * @returns Promise<void>
 */
export async function handler(event: APIGatewayProxyEvent): Promise<void> {
  const requestId = event?.requestContext?.requestId;
  logger.info({
    requestId,
    message: 'Hard delete projects from elastic search and dynamo db function invoked',
  });

  const duration = Config.PROJECT_DELETION_AGE;
  const [value, unit] = duration.split(' ');

  if (!value || !unit) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const dateToCompare = moment().subtract(value, unit as any);

  const query = createRequestBodySearchQuery(dateToCompare);

  logger.info({
    requestId,
    message: 'searching for projects that have been soft-deleted >=PROJECT_DELETION_AGE',
  });

  const result = await esClientObj.search(Jira.Enums.IndexName.Project, query);
  const res = await searchedDataFormatorWithDeleted(result);

  if (res.length > 0) {
    // deleting projects data from projects/sprints/boards/issues document
    await deleteProjectData(res, { requestId });

    // deleting project record from dynamo DB
    await deleteProjectfromDD(res, { requestId });
  }
}
