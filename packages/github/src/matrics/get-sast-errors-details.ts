import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import esb from 'elastic-builder';
import _ from 'lodash';
import { Config } from 'sst/node/config';
import { logger } from 'core';
import { paginate } from '../util/version-upgrades';

const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});
async function searchSastErrors(
    repoIds: string[],
    // orgName: string,
    startDate: string,
    endDate: string,
    branch: string[]
): Promise<Github.Type.SastErrorReport[]> {

    // TODO: uncomment this once we have organizationId is implemented on FE
    // const orgId = await getOrganization(orgName);
    const matchQry = esb
        .requestBodySearch()
        .query(
            esb
                .boolQuery()
                .must([
                    esb.termsQuery('body.repoId', repoIds),
                    // esb.termQuery('body.organizationId', orgId.id),
                    esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
                    esb.termsQuery('body.branch', branch),
                    esb.termQuery('body.isDeleted', false),
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
        )
        .toJSON();
    try {
        const searchedData: Github.Type.ISastErrorAggregationResult = await esClientObj.queryAggs(
            Github.Enums.IndexName.GitRepoSastErrors,
            matchQry
        );
        const formattedData = searchedData.errorsBucket.buckets.map((bucket) => ({
            errorMsg: bucket.key.errorMsg as string,
            errorRuleId: bucket.key.errorRuleId as string,
            errorFileName: bucket.key.errorFileName as string,
        }));
        return formattedData;
    } catch (err) {
        logger.error('searchSastErrorsMatrics.error', err);
        throw err;
    }
}

async function getRepoSastErrorsQuery(
    repoIds: string[],
    // orgName: string,
    startDate: string,
    endDate: string,
    branch: string[],
): Promise<object> {
    const data = await searchSastErrors(repoIds, startDate, endDate, branch);

    return esb
        .requestBodySearch()
        .size(0)
        .query(
            esb.boolQuery().should(
                data.map((error) =>
                    esb.boolQuery().must([
                        esb.termsQuery(
                            'body.errorMsg',
                            error.errorMsg
                        ),
                        esb.termsQuery(
                            'body.ruleId',
                            error.errorRuleId
                        ),
                        esb.termsQuery(
                            'body.fileName',
                            error.errorFileName
                        ),
                    ])
                )).minimumShouldMatch(1)
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
}
export async function getRepoSastErrors(
    repoIds: string[],
    startDate: string,
    endDate: string,
    branch: string[],
    page: number,
    limit: number,
    sort?: Github.Type.VersionUpgradeSortType
): Promise<Github.Type.SastErrorsAggregationData> {
    try {
        const requestBody = await getRepoSastErrorsQuery(
            repoIds,
            startDate,
            endDate,
            branch
        );
        const report = await esClientObj.queryAggs<Github.Type.ISastErrorAggregationResult>(
            Github.Enums.IndexName.GitRepoSastErrors,
            requestBody
        );

        const finalData: Github.Type.SastErrorsAggregation[] = report.errorsBucket.buckets.map(
            (bucket) => ({
                errorName: bucket.key.errorMsg as string,
                errorRuleId: bucket.key.errorRuleId as string,
                errorFileName: bucket.key.errorFileName as string,
                branchName: bucket.distinctBranchName.buckets.map(
                    (branchBucket) => branchBucket.key as string
                ),
                errorFirstOccurred: bucket.errorFirstOccurred.value_as_string as string,
            })
        );
        const totalPages = Math.ceil(finalData.length / limit);
        const sortedData = _.orderBy(
            finalData,
            [(item): Date => new Date(item.errorFirstOccurred)],
            sort?.order
        );
        const paginatedData = await paginate(sortedData, page, limit);

        return { sastErrors: paginatedData, totalPages, page };
    } catch (err) {
        logger.error('getRepoSastErrorsMatrics.error', err);
        throw err;
    }
}
