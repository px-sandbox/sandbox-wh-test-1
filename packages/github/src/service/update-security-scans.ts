import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Github, Other } from 'abstraction';
import moment from 'moment';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
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
async function fetchBranchesData(repoId: string, currDate: string): Promise<void> {

    const query = esb.boolQuery().must([
        esb.termQuery('body.repoId', repoId),
        esb.termQuery('body.protected', false),
    ]).toJSON();


    const branches = await esClient.searchWithEsb(Github.Enums.IndexName.GitBranch, query);
    const formattedData = await searchedDataFormator(branches);

    if (!formattedData.length) {
        logger.info(`GET_GITHUB_BRANCH_DETAILS: No branches found for repoId: ${repoId}`);
        return;
    }

    const branchesArr: string[] = formattedData.
        map((data: (Pick<Other.Type.Hit, "_id"> & Other.Type.HitBody)) => data.name);

    logger.info(`GET_GITHUB_BRANCH_DETAILS: sending data to SQS for repoId: ${repoId}, branches: ${branchesArr}`);
    branchesArr.forEach((branch) => {

        new SQSClient().sendMessage({ repoId, branch, currDate }, Queue.qGhScansSave.queueUrl);
    });

}

/**
 * Updates the security scans for the given repositories.
 * 
 * @param event - The APIGatewayProxyEvent object.
 * @returns A Promise that resolves to an APIGatewayProxyResult object.
 * @throws Error if repoIds are not provided or if an error occurs during the update process.
 */
const updateSecurityScans = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const repoIds = event.queryStringParameters?.repoIds?.split(',') ?? [];
    const currDate = moment().format('YYYY-MM-DD');

    if (!repoIds.length) {
        throw new Error('RepoIds are not provided!');
    }

    try {
        await Promise.all(
            repoIds.map(async (repoId) => {
                await fetchBranchesData(repoId, currDate);
            })
        );
        return responseParser.
            setMessage('successfully updated scans for today').
            setResponseBodyCode('SUCCESS').
            setStatusCode(HttpStatusCode['200']).
            send();
    } catch (e) {
        logger.error(e);
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = APIHandler(updateSecurityScans);
export { handler, updateSecurityScans };
