import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import _ from 'lodash';
import { Config } from 'sst/node/config';
import { getOrganization } from '../lib/get-organization';
import { searchedDataFormator } from '../util/response-formatter';
import { paginate } from '../util/version-upgrades';

const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});
async function searchSastErrors(
    repoIds: string[],
    orgName: string,
    startDate: string,
    endDate: string,
    branch: string[]
): Promise<Github.Type.SastErrorsData> {
    const orgId = await getOrganization(orgName);
    const matchQry = esb
        .boolQuery()
        .must([
            esb.termsQuery('body.repoId', repoIds),
            esb.termQuery('body.organizationId', orgId.id),
            esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
            esb.termsQuery('body.branch', branch),
            esb.termQuery('body.isDeleted', false),
        ])

        .toJSON();
    const searchedData = await esClientObj.searchWithEsb(
        Github.Enums.IndexName.GitRepoSastErrors,
        matchQry
    );

    const formattedData = await searchedDataFormator(searchedData);

    return formattedData;
}

export async function getRepoSastErrors(
    repoIds: string[],
    orgName: string,
    startDate: string,
    endDate: string,
    branch: string[],
    page: number,
    limit: number,
    sort?: Github.Type.VersionUpgradeSortType
): Promise<Github.Type.SastErrorsAggregationData> {

    const data = await searchSastErrors(repoIds, orgName, startDate, endDate, branch);
    const requestBody = esb
        .requestBodySearch()
        .size(0)
        .query(
            esb.boolQuery().must([
                esb.termQuery('body.isDeleted', false),
                esb.termsQuery(
                    'body.errorMsg',
                    data.map((error) => error.errorMsg)
                ),
                esb.termsQuery(
                    'body.ruleId',
                    data.map((error) => error.ruleId)
                ),
                esb.termsQuery(
                    'body.fileName',
                    data.map((error) => error.fileName)
                ),
            ])
        )
        .agg(
            esb
                .compositeAggregation('errorsBucket')
                .sources(
                    esb.CompositeAggregation.termsValuesSource('errorMsg', 'body.errorMsg'),
                    esb.CompositeAggregation.termsValuesSource('errorRuleId', 'body.ruleId'),
                    esb.CompositeAggregation.termsValuesSource('errorFileName', 'body.fileName')
                )
                .aggs([
                    esb.cardinalityAggregation('distinctBranch', 'body.branch'),
                    esb.termsAggregation('distinctBranchName', 'body.branch'),
                    esb.minAggregation('errorFirstOccurred', 'body.date'),
                ])
        )
        .toJSON();

    const report = await esClientObj.queryAggs<Github.Type.ISastErrorAggregationResponse>(
        Github.Enums.IndexName.GitRepoSastErrors,
        requestBody
    );

    const finalData: Github.Type.SastErrorsAggregation[] = report.errorsBucket.buckets.map((bucket) => ({
        errorName: bucket.key.errorMsg as string,
        errorRuleId: bucket.key.errorRuleId as string,
        errorFileName: bucket.key.errorFileName as string,
        branchName: bucket.distinctBranchName.buckets.map((branchBucket) => branchBucket.key as string),
        errorFirstOccurred: bucket.errorFirstOccurred.value_as_string as string
    }));
    const totalPages = Math.ceil(finalData.length / limit);
    const sortedData = _.orderBy(finalData, [(item): Date => new Date(item.errorFirstOccurred)], sort?.order);
    const paginatedData = await paginate(sortedData, page, limit);

    return { sastErrors: paginatedData, totalPages, page }
}
