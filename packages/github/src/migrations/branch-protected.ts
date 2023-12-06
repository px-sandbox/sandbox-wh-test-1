/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../util/response-formatter';
import { getBranches } from '../lib/get-branch-list';


const getReposFromES = async (): Promise<any> => {
    let reposFormatData;
    try {
        const reposData = [];
        const size = 100;
        let from = 0;
        const esClientObj = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });

        do {
            const query = esb
                .requestBodySearch().size(size)
                .query(
                    esb.matchAllQuery()
                )
                .from(from)
                .toJSON() as { query: object };

            const esReposData = await esClientObj.paginateSearch(
                Github.Enums.IndexName.GitRepo,
                query
            );

            reposFormatData = await searchedDataFormator(esReposData);
            reposData.push(...reposFormatData);
            from += size;

            const getBranchesPromises = reposData.map((repoData) =>
                getBranches(repoData.githubRepoId, repoData.name, repoData.owner));
            await Promise.all(getBranchesPromises);
        } while (reposFormatData.length === size);

        return reposData;
    } catch (error) {
        logger.error('getReposFromES.error', error);
        throw error;
    }
};

export async function handler(): Promise<APIGatewayProxyResult> {
    const repos = await getReposFromES();
    return responseParser
        .setBody({ headline: repos })
        .setMessage('Headline for update protected keyword in branch data')
        .setStatusCode(HttpStatusCode['200'])
        .setResponseBodyCode('SUCCESS')
        .send();
}
