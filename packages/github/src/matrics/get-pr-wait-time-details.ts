import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import {
    PrDetails,
    PrDetailsGraph,
    PrDetailsSort,
    PrDetailsSorting,
} from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getOrganizationById } from '../lib/get-organization';
import { searchedDataFormator } from '../util/response-formatter';
import { getRepoNames } from './get-sast-errors-details';

const esClientObj = ElasticSearchClientGh.getInstance();
export async function prWaitTimeDetailsData(
    startDate: string,
    endDate: string,
    page: number,
    limit: number,
    repoIds: string[],
    sort: PrDetailsSort,
    orgId: string
): Promise<PrDetails> {
    try {
        const query = esb
            .boolQuery()
            .must([
                esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
                esb.termsQuery('body.repoId', repoIds),
            ])
            .toJSON();

        logger.info('PR_WAIT_TIME_DETAILS_GRAPH_ESB_QUERY', query);

        const [orgName, prData, repoNames] = await Promise.all([
            await getOrganizationById(orgId),
            (await esClientObj.search(
                Github.Enums.IndexName.GitPull,
                query,
                (page - 1) * limit,
                limit,
                [`${PrDetailsSorting[sort.key] ?? PrDetailsSorting.prWaitTime}:${sort.order}`],
            )) as Other.Type.HitBody,
            await getRepoNames(repoIds),
        ]);

        const formattedPrData = await searchedDataFormator(prData);

        const finalData = formattedPrData.map((item: PrDetailsGraph) => {
            const repoName = repoNames.find((repo: Github.Type.RepoNameType) => repo.id === item.repoId);

            return {
                prName: item.title,
                pullNumber: item.pullNumber,
                repoName: repoName?.name,
                prRaisedAt: item.createdAt,
                prPickedAt: item.reviewedAt,
                prWaitTime: item.reviewSeconds,
                prLink: encodeURI(
                    `https://github.com/${orgName.name}/${repoName?.name}/pull/${item.pullNumber}`
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
