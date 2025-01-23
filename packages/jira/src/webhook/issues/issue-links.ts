import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { JiraClient } from 'src/lib/jira-client';
import { getIssueById } from 'src/repository/issue/get-issue';

const esClientObj = ElasticSearchClient.getInstance();
/**
 * Updating jira issue links.
 * destination issue id is inward
 * source issue id is outward
 */
export async function issueLinkHandler(
  issue: Jira.ExternalType.Webhook.IssueLinks,
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = issue.destinationIssueId;
  logger.info({ message: 'issueLinkHandler.invoked', data: { issue, requestId, resourceId } });
  try {
    //GET issue from elastic search
    const issueData = await getIssueById(issue.destinationIssueId, organization, {
      requestId,
      resourceId,
    });

    //Get the issue data from api
    const jiraClient = await JiraClient.getClient(organization);
    const issueDataFromApi = await jiraClient.getIssue(issue.destinationIssueId);

    if (!issueDataFromApi || !issueData) {
      logger.error({
        message: 'issueLinkHandler.issueDataNotFound',
        data: { issue, requestId, resourceId },
      });
      return;
    }
    const issueDocId = issueData._id;
    const {
      fields: { issuelinks },
    } = issueDataFromApi;

    logger.info({
      message: 'issueLinkHandler.issuelinks.length',
      data: { length: issuelinks.length },
    });
    //update the issue link data in the destination issue id
    await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
      body: { issueLinks: issuelinks },
    });
  } catch (error) {
    logger.error({
      message: 'issueLinkHandler.error',
      data: { resourceId, error: `${error}` },
    });
    throw error;
  }
}
