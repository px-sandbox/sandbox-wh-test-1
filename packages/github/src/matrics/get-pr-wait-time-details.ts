import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import {
    PrDetails,
    PrDetailsGraph,
    PrDetailsSort,
    PrDetailsSorting,
} from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { getOrganizationById } from '../lib/get-organization';
import { searchedDataFormator } from '../util/response-formatter';
import { getRepoNames } from './get-sast-errors-details';

async function getOrgName(query: object, esClientObj: ElasticSearchClient): Promise<string> {
    try {
        const prData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, query, 0, 1);
        const [formattedPrData] = await searchedDataFormator(prData);
        const orgName = await getOrganizationById(formattedPrData.organizationId);
        return orgName.name;
    } catch (e) {
        logger.error(`getOrgName.error, ${e}`);
        throw e;
    }
}
export async function prWaitTimeDetailsData(
    startDate: string,
    endDate: string,
    page: number,
    limit: number,
    repoIds: string[],
    sort: PrDetailsSort
): Promise<PrDetails> {
    try {
        const esClientObj = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const query = await esb
            .boolQuery()
            .must([
                esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
                esb.termsQuery('body.repoId', repoIds),
            ])
            .toJSON();

        logger.info('PR_WAIT_TIME_DETAILS_GRAPH_ESB_QUERY', query);
        const orgName = await getOrgName(query, esClientObj);
        const prData: Other.Type.HitBody = await esClientObj.searchWithEsb(
            Github.Enums.IndexName.GitPull,
            query,
            (page - 1) * limit,
            limit,
            [`${PrDetailsSorting[sort.key]}:${sort.order}`]
        );
        const [formattedPrData, repoNames] = await Promise.all([
            searchedDataFormator(prData),
            getRepoNames(repoIds),
        ]);
        const finalData = formattedPrData.map((item: PrDetailsGraph) => {
            const repoName = repoNames.find((repo: Github.Type.RepoNameType) => repo.id === item.repoId);

            return {
                prName: item.title,
                pullNumber: item.pullNumber,
                repoName: repoName?.name,
                prRaisedAt: item.createdAt,
                prPickedAt: item.githubDate,
                prWaitTime: item.reviewSeconds,
                prLink: encodeURI(
                    `https://github.com/${orgName}/${repoName?.name}/pull/${item.pullNumber}`
                ),
            };
        });
        if (!finalData?.length) {
            return { data: [], totalPages: 0, page: 0 };
        }
        const totalPages = Math.ceil(prData.hits.total.value / limit);
        return { data: finalData, totalPages, page };
    } catch (e) {
        logger.error(`prWaitTimeDetailsBreakdown.error, ${e}`);
        throw e;
    }
}
