import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from './response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

export async function getFailedStatusDetails(orgId: string): Promise<Other.Type.HitBody> {
  try {
    const issueStatusquery = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termQuery('body.pxStatus', 'QA_Failed'),
            esb.termQuery('body.organizationId', orgId),
          ])
      );
    logger.info('ESB_QUERY_ISSUE_STATUS_QUERY', { issueStatusquery });
    const { body: data } = await esClientObj.search(
      Jira.Enums.IndexName.IssueStatus,
      issueStatusquery.query
    );
    const [issueStatusData] = await searchedDataFormator(data);
    return issueStatusData;
  } catch (error) {
    logger.error('getIssueStatusData.error', { error });
    throw error;
  }
}

export async function getIssueStatusForReopenRate(orgId: string): Promise<Other.Type.HitBody> {
  try {
    const issueStatusquery = esb.requestBodySearch().size(100);
    issueStatusquery.query(
      esb
        .boolQuery()
        .must([esb.termQuery('body.organizationId', orgId), esb.existsQuery('body.pxStatus')])
    );
    logger.info('ESB_QUERY_REOPEN_RATE_QUERY', { issueStatusquery });
    const { body: data } = await esClientObj.search(
      Jira.Enums.IndexName.IssueStatus,
      issueStatusquery
    );
    const issueStatusDataArr = await searchedDataFormator(data);
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
