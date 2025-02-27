import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { ALLOWED_ISSUE_TYPES } from '../../constant/config';
import { generateUuid, searchedDataFormator } from '../../util/response-formatter';
import { getOrganization } from '../../repository/organization/get-organization';

const sqsClient = SQSClient.getInstance();
const esClient = ElasticSearchClient.getInstance();
// export async function worklogHandler(
//   worklog: Jira.ExternalType.Webhook.Worklog,
//   eventName: string,
//   timestamp: Moment,
//   organization: string,
//   requestId: string
// ) {
//   const { issueId } = worklog;
//   try {
//     const orgId = await getOrganization(organization);
//     if (!orgId) {
//       throw new Error(`worklog.hanlder.organization ${organization} not found`);
//     }
//     await sqsClient.sendMessage(
//       {
//         ...worklog,
//         eventName,
//         createdDate: timestamp,
//         organization,
//       },
//       Queue.qWorklogFormat.queueUrl,
//       { requestId, resourceId: worklog.id }
//     );
//   } catch (error) {
//     logger.error({ requestId, resourceId: issueId, message: 'worklog.handler.error', error });
//     throw error;
//   }
// }

export async function worklog(
  worklog: Jira.ExternalType.Webhook.Worklog,
  issueId: string,
  eventName: string,
  eventTime: moment.Moment,
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
      logger.error({
        requestId,
        resourceId: worklog.id,
        message: `worklog.no_issue_found: ${organization}, issueId: ${worklog.issueId}`,
      });
      throw new Error(`worklog.no_issue_found: ${organization}, issueId: ${issueId}`);
    }

    // checking if issue type is allowed

    if (!ALLOWED_ISSUE_TYPES.includes(issueData?.issueType)) {
      logger.info({ message: 'processWorklogEvent: Issue type not allowed' });
      return;
    }

    // checking is project key is available in our system
    const projectKeys = Config.IGNORED_PROJECT_KEYS?.split(',') || [];
    const projectKey = issueData?.projectKey;
    if (projectKeys.includes(projectKey)) {
      logger.info({ message: 'processWorklogEvent: Project not available in our system' });
      return;
    }
    const createdDate = moment(eventTime).toISOString();
    logger.info({
      requestId,
      resourceId: worklog.id,
      ...worklog,
      message: 'worklog.prepared_data',
    });

    await Promise.all([
      sqsClient.sendFifoMessage(
        {
          organization,
          projectId: issueData.projectId,
          boardId: issueData.boardId,
          sprintId: issueData.sprintId,
          issueId,
          worklog,
          eventName,
        },
        Queue.qIssueFormat.queueUrl,
        { requestId, resourceId: issueId },
        worklog.issueId,
        generateUuid()
      ),
      sqsClient.sendMessage(
        {
          worklog,
          eventName,
          issueData,
          createdDate,
          organization,
        },
        Queue.qWorklogFormat.queueUrl,
        { requestId, resourceId: worklog.id }
      ),
    ]);
    logger.info({ requestId, resourceId: worklog.id, message: 'worklog.success' });
  } catch (error) {
    logger.error({ requestId, resourceId: issueId, message: 'worklog.error', error });
    throw error;
  }
}

export async function fetchJiraIssues(
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
          esb.termQuery('body.organizationId', orgId),
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
