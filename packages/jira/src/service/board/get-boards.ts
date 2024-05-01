import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { formatBoardResponse, searchedDataFormator } from '../../util/response-formatter';
import { getBoardsSchema } from '../validations';

/**
 * Retrieves all boards and sprints for a project from ElasticSearch based on the provided `orgId` and `projectId`.
 * @param event - The APIGatewayProxyEvent object containing the query string parameters.
 * @returns A Promise that resolves to an APIGatewayProxyResult object containing the retrieved board and sprint data.
 * @throws An error if the board details cannot be retrieved.
 */
// eslint-disable-next-line max-lines-per-function
const esClient = ElasticSearchClient.getInstance();

/**
 * Retrieves boards data based on the provided parameters.
 *
 * @param projectId - The ID of the project.
 * @param orgId - The ID of the organization.
 * @param size - The number of results to retrieve.
 * @param from - The starting index of the results.
 * @returns A promise that resolves to an array of board data.
 */
async function boardResData(
  projectId: string,
  orgId: string,
  size: number,
  from: number
): Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  const query = esb
    .requestBodySearch()
    .size(size)
    .from(from)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.organizationId', orgId),
          esb.termQuery('body.type', Jira.Enums.BoardType.Scrum),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .sort(esb.sort('body.boardId', 'desc'))
    .toJSON();

  const data = await esClient.search(Jira.Enums.IndexName.Board, query);
  // formatting above query response data
  return searchedDataFormator(data);
}

async function manipulatedBoardsData(
  boardResponse: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[],
  projectId: string,
  orgId: string,
  size: number,
  from: number
): Promise<(Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  return Promise.all([
    ...boardResponse.map(async (item: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) => {
      const boardItem = item;
      const boardItemQuery = esb
        .requestBodySearch()
        .size(size)
        .from(from)
        .query(
          esb
            .boolQuery()
            .must([
              esb.termQuery('body.originBoardId', item.id),
              esb.termQuery('body.projectId', projectId),
              esb.termQuery('body.organizationId.keyword', orgId),
              esb.termQuery('body.isDeleted', false),
            ])
            .mustNot(esb.termQuery('body.state', Jira.Enums.SprintState.FUTURE))
        )
        .sort(esb.sort('body.startDate', 'desc'))
        .toJSON();

      const sprintsData = await esClient.search(Jira.Enums.IndexName.Sprint, boardItemQuery);
      const sprintsResponse = await searchedDataFormator(sprintsData);
      logger.info({
        level: 'info',
        message: 'jira sprints formatted data',
        data: sprintsResponse,
      });
      boardItem.sprints = sprintsResponse;
      return boardItem;
    }),
  ]);
}

/**
 * Retrieves all boards and sprints for a project.
 *
 * @param event - The APIGatewayProxyEvent object.
 * @returns A Promise that resolves to an APIGatewayProxyResult object.
 */
const boards = async function getBoardsData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { orgId, projectId } = event.queryStringParameters as { orgId: string; projectId: string };
  logger.info({ level: 'info', message: 'jira orgId', data: { orgId, projectId } });

  // To get all boards and sprints for a project we set 1000 items for now as per our assumption
  // there will be less than 1000 boards or 1000 sprints for a project
  const size = 1000;
  const from = 0;

  try {
    logger.info({ level: 'info', message: 'jira projectId', data: projectId });
    const boardResponse = await boardResData(projectId, orgId, size, from);
    const boardsData = await manipulatedBoardsData(boardResponse, projectId, orgId, size, from);
    logger.info({
      level: 'info',
      message: 'jira new response for boards data',
      data: boardsData,
    });

    let body = null;
    const { '200': ok, '404': notFound } = HttpStatusCode;
    let statusCode = notFound;
    if (boardsData) {
      statusCode = ok;
      body = { organizationId: orgId, projectId, boards: formatBoardResponse(boardsData) };
    }
    return responseParser
      .setBody(body)
      .setMessage('Get all Boards and sprints for a project')
      .setStatusCode(statusCode)
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error('GET_JIRA_BOARD_DETAILS', { error });
    throw new Error(`Not able to get board details: ${error}`);
  }
};

const handler = APIHandler(boards, {
  eventSchema: transpileSchema(getBoardsSchema),
});

export { boards, handler };
