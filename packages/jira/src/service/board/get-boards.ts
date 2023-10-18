import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import { formatBoardResponse, searchedDataFormator } from '../../util/response-formatter';
import { getBoardsSchema } from '../validations';

// eslint-disable-next-line max-lines-per-function
const boards = async function getBoardsData(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const { orgId, projectId } = event.queryStringParameters as { orgId: string, projectId: string };
    logger.info({ level: 'info', message: 'jira orgId', data: { orgId, projectId } });

    // To get all boards and sprints for a project we set 1000 items for now as per our assumption 
    // there will be less than 1000 boards or 1000 sprints for a project
    const size = 1000;
    const from = 0;


    try {
        const esClient = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });


        logger.info({ level: 'info', message: 'jira projectId', data: projectId });
        const query = {
            bool: {
                must: [
                    { match: { 'body.projectId': projectId } },
                    { match: { 'body.organizationId': orgId } },
                    { match: { 'body.type': Jira.Enums.BoardType.Scrum } },
                    { match: { 'body.isDeleted': false } },
                ],
            },
        };

        // fetching data from elastic search based on query
        const { body: data } = await esClient.getClient().search({
            index: Jira.Enums.IndexName.Board,
            body: {
                query,
            },
            from,
            size,
        });

        // formatting above query response data
        const boardResponse = await searchedDataFormator(data);

        const boardsData = await Promise.all([
            ...boardResponse.map(
                async (
                    item: (Pick<Other.Type.Hit, "_id"> & Other.Type.HitBody)
                ) => {
                    const boardItem = item;
                    const sprintQuery = {
                        bool: {
                            must: [
                                { match: { 'body.originBoardId': item.id } },
                                { match: { 'body.projectId': projectId } },
                                { match: { 'body.organizationId': orgId } },
                                { match: { 'body.isDeleted': false } },
                            ],
                            must_not: [{ match: { 'body.state': Jira.Enums.SprintState.FUTURE } }],
                        },
                    };
                    const { body: sprintsData } = await esClient.getClient().search({
                        index: Jira.Enums.IndexName.Sprint,
                        body: {
                            sort: [{ 'body.startDate': { order: 'asc' } }],
                            query: sprintQuery,
                        },
                        from,
                        size,
                    });

                    const sprintsResponse = await searchedDataFormator(sprintsData);
                    logger.info({
                        level: 'info', message: 'jira sprints formatted data',
                        data: sprintsResponse
                    });
                    boardItem.sprints = sprintsResponse;
                    return boardItem;

                }
            ),
        ]);
        logger.info({ level: 'info', message: 'jira new response for boards data', data: boardsData });

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
