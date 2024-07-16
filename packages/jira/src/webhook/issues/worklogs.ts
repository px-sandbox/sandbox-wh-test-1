import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { formatIssue } from '../../util/issue-helper';
import { searchedDataFormator } from '../../util/response-formatter';
import { getOrganization } from '../../repository/organization/get-organization';
import { ALLOWED_ISSUE_TYPES } from '../../constant/config';

const esClient = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function fetchJiraIssues(
  issueId: string,
  orgId: string,
  requestId: string
): Promise<Other.Type.HitBody> {
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
    const unformattedIssues: Other.Type.HitBody = await esClient.search(
      Jira.Enums.IndexName.Issue,
      issueQuery
    );
    const [issuesData] = await searchedDataFormator(unformattedIssues);

    logger.info({
      requestId,
      resourceId: issueId,
      message: 'fetchJiraIssues.successful',
      data: { issuesData },
    });
    return issuesData;
  } catch (error) {
    logger.error({ requestId, resourceId: issueId, message: 'fetchJiraIssues.error', error });
    throw error;
  }
}

export async function worklog(
  issueId: string,
  organization: string,
  requestId: string
): Promise<void> {
  try {
    const orgId = await getOrganization(organization);
    if (!orgId) {
      throw new Error(`worklog.organization ${organization} not found`);
    }
    const issueData = await fetchJiraIssues(issueId, orgId.id, requestId);
    if (!issueData) {
      throw new Error(`worklog.no_issue_found: ${organization}, issueId: ${issueId}`);
    }

    // checking if issue type is allowed

    if (!ALLOWED_ISSUE_TYPES.includes(issueData?.issueType)) {
      logger.info({message: 'processWorklogEvent: Issue type not allowed'});
      return;
    }

    // checking is project key is available in our system
    const projectKeys = Config.AVAILABLE_PROJECT_KEYS?.split(',') || [];
    const projectKey = issueData?.projectKey;
    if (!projectKeys.includes(projectKey)) {
      logger.info({message: 'processWorklogEvent: Project not available in our system'});
      return;
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
      { requestId, resourceId: issueId },
      issue.key,
      uuid()
    );
    logger.info({ requestId, resourceId: issueId, message: 'worklog.success' });
  } catch (error) {
    logger.error({ requestId, resourceId: issueId, message: 'worklog.error', error });
    throw error;
  }
}
