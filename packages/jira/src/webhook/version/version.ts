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
import { getProjectById } from 'src/repository/project/get-project';

const sqsClient = SQSClient.getInstance();
const esClient = ElasticSearchClient.getInstance();
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

export async function version(
  versionData: Jira.ExternalType.Webhook.Version,
  eventName: string,
  organization: string,
  requestId: string
): Promise<void> {
  try {
    const orgId = await getOrganization(organization);
    if (!orgId) {
      throw new Error(`version.organization ${organization} not found`);
    }
    const projectData = await getProjectById(Number(versionData.projectId), organization, { requestId });
    if (!projectData) {
      throw new Error(`version.project ${projectData} not found`);
    }

    logger.info({
      requestId,
      resourceId: versionData.id,
      ...versionData,
      message: 'version.prepared_data',
    });

    await Promise.all([
      sqsClient.sendMessage(
        {
        versionData,
          eventName,
          organization,
          projectKey: projectData.key
        },
        Queue.qVersionFormat.queueUrl,
        { requestId, resourceId: versionData.id }
      ),
    ]);
    logger.info({ requestId, resourceId: versionData.id, message: 'version.success' });
  } catch (error) {
    logger.error({ requestId, resourceId: versionData.id, message: 'version.error', error });
    throw error;
  }
}
