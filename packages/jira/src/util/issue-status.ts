import { ElasticSearchClient } from "@pulse/elasticsearch";
import { Jira, Other } from "abstraction";
import { logger } from "core";
import esb from "elastic-builder";
import { Config } from "sst/node/config";
import { searchedDataFormator } from "./response-formatter";

export async function getFailedStatusDetails(orgId: string): Promise<Other.Type.HitBody> {
    try {
        const esClient = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const issueStatusquery = esb.requestBodySearch()
        issueStatusquery.query(
            esb
                .boolQuery()
                .must([
                    esb.termQuery('body.pxStatus', 'QA_Failed'),
                    esb.termQuery('body.organizationId', orgId),
                ])
        );
        logger.info('ESB_QUERY_ISSUE_STATUS_QUERY', { issueStatusquery });
        const { body: data } = await esClient.getClient().search({
            index: Jira.Enums.IndexName.IssueStatus,
            body: issueStatusquery,
        });
        const [issueStatusData] = await searchedDataFormator(data);
        return issueStatusData;
    } catch (error) {
        logger.error('getIssueStatusData.error', { error });
        throw error;
    }
}

export async function getIssueStatusForReopenRate(orgId: string): Promise<Other.Type.HitBody> {
    try {
        const esClient = new ElasticSearchClient({
            host: Config.OPENSEARCH_NODE,
            username: Config.OPENSEARCH_USERNAME ?? '',
            password: Config.OPENSEARCH_PASSWORD ?? '',
        });
        const issueStatusquery = esb.requestBodySearch().size(100);
        issueStatusquery.query(
            esb
                .boolQuery()
                .must([
                    esb.termQuery('body.organizationId', orgId),
                    esb.existsQuery('body.pxStatus'),
                ])
        )
        logger.info('ESB_QUERY_REOPEN_RATE_QUERY', { issueStatusquery });
        const { body: data } = await esClient.getClient().search({
            index: Jira.Enums.IndexName.IssueStatus,
            body: issueStatusquery,
        });
        const issueStatusDataArr = await searchedDataFormator(data);
        console.log('issueStatusDataArr', issueStatusDataArr);
        const issueStatusData = issueStatusDataArr.reduce((acc: Record<string, any>, issueStatus) => {
            acc[issueStatus.pxStatus] = issueStatus.issueStatusId;
            return acc;
        }, {});
        return issueStatusData;
    } catch (error) {
        logger.error('getIssueStatusData.error', { error });
        throw error;
    }
}