import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { PrDetails, PrDetailsGraph, PrDetailsSort } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import _ from 'lodash';
import { getOrganizationById } from 'src/lib/get-organization';
import { searchedDataFormator } from 'src/util/response-formatter';
import { paginate } from 'src/util/version-upgrades';
import { Config } from 'sst/node/config';
import { getRepoNames } from './get-sast-errors-details';

async function sortData(
    data: Github.Type.prDetailsData[],
    sort?: PrDetailsSort
): Promise<Github.Type.prDetailsData[]> {
    console.log(data);
    const sortKeys = ['waitTime'];
    const sortDir = [Github.Enums.SortOrder.DESC];

    if (sort) {
        sortKeys.push(sort.key);
        sortDir.push(sort.order);
    } else {
        sortKeys.push(Github.Enums.SortKey.DATEDIFF);
        sortDir.push(Github.Enums.SortOrder.DESC);
    }
    return _.orderBy(data, sortKeys, sortDir);
}

async function getOrgName(query: object, esClientObj: ElasticSearchClient) {
    const prData = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitPull, query, 1, 1);
    const [formattedPrData] = await searchedDataFormator(prData);
    const orgName = await getOrganizationById(formattedPrData.organizationId);
    return orgName.name;
}
export async function prWaitTimeDetailsData(
    startDate: string,
    endDate: string,
    page: number,
    limit: number,
    repoIds: string[],
    sort?: PrDetailsSort
): Promise<PrDetails> {
    const size = 100;
    let from = 0;
    let formattedPrData = [];
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
        do {
            const prData = await esClientObj.searchWithEsb(
                Github.Enums.IndexName.GitPull,
                query,
                from,
                size,
                ['body.reviewSeconds']
            );
            formattedPrData = await searchedDataFormator(prData);
            formattedPrData.push(...formattedPrData);
            from += size;
        } while (formattedPrData.length === size);
        const repoNames = await getRepoNames(repoIds);
        const finalData = formattedPrData.map(
            (item: PrDetailsGraph) => {
                const repoName = repoNames.find(
                    (repo: Github.Type.RepoNameType) => repo.id === item.repoId
                );
                let totalSeconds = item.reviewSeconds;
                let hours = Math.floor(totalSeconds / 3600);
                let minutes = Math.floor((totalSeconds % 3600) / 60);

                return {
                    id: item._id,
                    name: item.title,
                    prCreatedAt: item.createdAt,
                    prPickedAt: item.githubDate,
                    waitTime: `${hours}h ${minutes}m`,
                    link: encodeURI(
                        `https://github.com/${orgName}/${repoName?.name}/pull/${item.pullNumber}`
                    ),
                };
            }
        );
        if (!finalData?.length) {
            return { data: [], totalPages: 0, page: 0 };
        }
        const totalPages = Math.ceil(finalData.length / limit);

        // sorting data
        const sortedData = await sortData(finalData, sort);

        // paginating data
        const paginatedData = await paginate<Github.Type.prDetailsData>(sortedData, page, limit);
        return { data: paginatedData, totalPages, page };
    } catch (e) {
        logger.error(`prWaitTimeDetailsBreakdown.error, ${e}`);
        throw e;
    }
}
