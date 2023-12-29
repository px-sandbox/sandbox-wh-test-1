import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const updateMergeCommit = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const repoId: string = event.queryStringParameters?.repoId || '';
    const repoOwner: string = event.queryStringParameters?.repoOwner || '';
    try {
        logger.info({ level: 'info', message: 'repo name -->', repoId, repoOwner });

        const esObj = await new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const repoData = await esObj.search(Github.Enums.IndexName.GitRepo, 'id', repoId);
        if (repoData) {
            const [repo] = await searchedDataFormator(repoData);
            logger.info({ level: 'info', message: 'repo name -->', repoName: repo.name });
            const query = esb
                .requestBodySearch()
                .size(10000)
                .query(esb.boolQuery().must(esb.termsQuery('body.repoId', repo.id)));

            const searchInEsb = await esObj.paginateSearch(
                Github.Enums.IndexName.GitCommits,
                query.toJSON()
            );
            const commitData = await searchedDataFormator(searchInEsb);
            await Promise.all(commitData.map(async (commit: Github.Type.Commits) => {
                await new SQSClient().sendMessage(
                    { ...commit, repoName: repo.name, repoOwner },
                    Queue.qUpdateMergeCommit.queueUrl
                );
            }));

            return responseParser
                .setBody('DONE')
                .setMessage('updating merge commits')
                .setStatusCode(HttpStatusCode[200])
                .setResponseBodyCode('SUCCESS')
                .send();
        }
        return responseParser
            .setBody('DONE')
            .setMessage('No repo found')
            .setStatusCode(HttpStatusCode[400])
            .setResponseBodyCode('Failed')
            .send();
    } catch (err) {
        logger.error({ level: 'error', message: 'error in fetching github repo data', err });
        throw err;
    }
};

const handler = updateMergeCommit;
export { handler, updateMergeCommit };
