import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});

/**
 * Fetches branches data for the given repository IDs.
 * @param repoIds - An array of repository IDs.
 * @returns A promise that resolves to an array of branch names.
 */
async function fetchBranchesData(repoIds: string[]): Promise<string[]> {

    const query = esb.boolQuery().
        must([esb.termsQuery('body.repoId', repoIds), esb.termQuery('body.protected', true)]).toJSON();

    logger.info('GET_GITHUB_BRANCH_DETAILS: will now fetch data from ES');
    const branches = await esClient.searchWithEsb(Github.Enums.IndexName.GitBranch, query);

    const formattedData = await searchedDataFormator(branches);

    if (!formattedData.length) {
        logger.info('GET_GITHUB_BRANCH_DETAILS: No branches data found in ES for given repoIds');
        return [];
    }

    const branchesArr: string[] = formattedData.map((data: Github.Type.FormattedBranches) => data.name);
    logger.info('GET_GITHUB_BRANCH_DETAILS: branches data found in ES for given repoIds', { branchesArr });

    return [...new Set(branchesArr)];
}
/**
 * Retrieves branch data for the given repositories.
 * 
 * @param event - The APIGatewayProxyEvent object.
 * @returns A Promise that resolves to an APIGatewayProxyResult object.
 * @throws Error if repoIds are not provided.
 */
const gitBranches = async function getBranchesData(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    logger.info('GET_GITHUB_BRANCH_DETAILS', { event });

    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
    if (repoIds.length <= 0) {
        logger.error('repoIds is empty but they are required', { repoIds });
        throw new Error('RepoIds are required');
    }

    try {

        const body = await fetchBranchesData(repoIds);
        if (!body.length) {
            return responseParser.
                setBody(body).
                setMessage('Branches not found').
                setStatusCode(HttpStatusCode['404']).
                setResponseBodyCode('NOT FOUND').
                send();
        }

        return responseParser.
            setBody(body).
            setMessage('Branches fetched successfully').
            setStatusCode(HttpStatusCode['200']).
            setResponseBodyCode('SUCCESS').
            send();

    } catch (error) {
        logger.error('GET_GITHUB_BRANCH_DETAILS', { error });
        throw error;
    }

};
const handler = APIHandler(gitBranches);

export { gitBranches, handler };
