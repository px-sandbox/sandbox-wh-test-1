import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getOrganization } from 'src/repository/organization/get-organization';
import { formatIssue } from 'src/util/issue-helper';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';

const esClient = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function fetchJiraIssues(issueId: string, orgId: string): Promise<Other.Type.HitBody> {
  const issueQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.issueId', issueId),
          esb.termQuery('body.organizationId.keyword', orgId),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .toJSON();
  try {
    let unformattedIssues: Other.Type.HitBody = await esClient.search(
      Jira.Enums.IndexName.Issue,
      issueQuery
    );
    const [issuesData] = await searchedDataFormator(unformattedIssues);

    logger.info(`fetchJiraIssues.successful id:, ${JSON.stringify(issuesData)}`);
    return issuesData;
  } catch (error) {
    logger.error(`fetchJiraIssues.error, ${error} , ${issueId}`);
    throw error;
  }
}

export async function worklog(issueId: string, organization: string): Promise<void> {
  try {
    const orgId = await getOrganization(organization);
    if (!orgId) {
      throw new Error(`worklog.organization ${organization} not found`);
    }
    const issueData = await fetchJiraIssues(issueId, orgId.id);
    if (issueData.length === 0) {
      throw new Error(`worklog.no_issue_found: ${organization}, issueId: ${issueId}`);
    }
    const issue = formatIssue(issueData);
    await sqsClient.sendFifoMessage(
      {
        organization,
        projectId: issueData.projectId,
        boardId: issueData.boardId,
        sprintId: issueData.sprintId,
        issue,
      },
      Queue.qIssueFormat.queueUrl,
      issue.key,
      uuid()
    );
    logger.info('worklog.success', { issueId });
  } catch (error) {
    logger.error(`worklog.error, ${error} , ${issueId}`);
    throw error;
  }
}
