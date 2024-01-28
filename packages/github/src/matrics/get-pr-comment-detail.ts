import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { IRepo, searchedDataFormator } from '../util/response-formatter';

const esClientObj = new ElasticSearchClient({

    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});

export async function prCommentsDetailMetrics(
    startDate: string,
    endDate: string,
    repoIds: string[],
    page: number,
    limit: number,
    sortKey: string,
    sortOrder: string
): Promise<IRepo[]> {
    logger.info('Get PR Comment Detail');
    try {
        // esb query to fetch pull request data
        const query =
            esb.boolQuery().must([
                esb.termsQuery('body.repoId', repoIds),
                esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
            ]);



        // We are going to result based on the sort key and sort order
        const sort = [`body.${sortKey}:${sortOrder}`];

        // We are only going to fetch limited number of fields
        const source = [
            "body.title",
            "body.pullNumber",
            "body.reviewComments",
            "body.repoId",
            "body.createdAt",
            "body.reviewedAt",
        ];

        // Fetching data from ES and formatting it
        const response = await searchedDataFormator(
            await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, query, (page - 1), limit, sort, source)
        );

        logger.info(`PR-Comment-Detail-Pull-Requests: ${JSON.stringify(response)}`);

        let repoIdArray = []; // will store all the repoId from the response
        // extracting repoId from the response into an array
        for (let i = 0; i < response.length; i += 1) {
            repoIdArray.push(response[i].repoId);

        }
        repoIdArray = [...new Set(repoIdArray)]; // removing duplicate repoId from the array

        // esb query to fetch repo name from ES
        const repoNameQuery = esb.boolQuery().must(esb.termsQuery('body.id', repoIdArray));
        // Fetching repo name from ES and formatting it
        const repoNames = await searchedDataFormator(
            await esClientObj.searchWithEsb(
                Github.Enums.IndexName.GitRepo,
                repoNameQuery,
                0,
                response.length,
                [],
                ['body.id', 'body.name']
            )
        );
        logger.info(`PR-Comment-Detail-Repo-Names: ${JSON.stringify(repoNames)}`);

        // repo object with repoId as key and repoName as value for easy access when formatting final response
        const repoObj: Record<string, string> = {};
        repoNames.forEach((repo: { _id: string, id: string, name: string }) => {
            repoObj[`${repo.id}`] = repo.name;
        });

        // adding repoName to the finalResponse
        const finalResponse = response.map((ele: { repoId: string | number; }) => ({
            ...ele,
            repoName: repoObj[ele.repoId] ?? ''
        }));

        return finalResponse;
    } catch (e) {
        logger.error(`Get PR Comment Detail.Error: ${e}`);
        throw new Error(`Get PR Comment Detail.Error: ${e}`);
    }
}
