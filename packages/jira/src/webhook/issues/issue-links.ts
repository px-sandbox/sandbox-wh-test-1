import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { Hit } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import { mappingPrefixes } from 'src/constant/config';
import { JiraClient } from 'src/lib/jira-client';
import { getIssueById, getIssuesById } from 'src/repository/issue/get-issue';

const esClientObj = ElasticSearchClient.getInstance();

function prepareInwardIssue(
  issueLink: Jira.ExternalType.Webhook.IssueLinks,
  sourceIssueId: Pick<Hit, '_id'> & HitBody
) {
  return {
    id: issueLink.id,
    type: issueLink.issueLinkType,
    inwardIssue: {
      id: sourceIssueId.issueId,
      key: sourceIssueId.issueKey,
      fields: {
        status: {
          name: sourceIssueId.status,
        },
        priority: {
          name: sourceIssueId.priority,
        },
        issueType: {
          name: sourceIssueId.issueType,
        },
      },
    },
  };
}

function prepareOutWardIssue(
  issueLink: Jira.ExternalType.Webhook.IssueLinks,
  destIssueId: Pick<Hit, '_id'> & HitBody
) {
  return {
    id: issueLink.id,
    type: issueLink.issueLinkType,
    outwardIssue: {
      id: destIssueId.issueId,
      key: destIssueId.issueKey,
      fields: {
        status: {
          name: destIssueId.status,
        },
        priority: {
          name: destIssueId.priority,
        },
        issueType: {
          name: destIssueId.issueType,
        },
      },
    },
  };
}
/**
 * Updating jira issue links.
 * destination issue id is inward
 * source issue id is outward
 */

export async function issueLinkHandler(
  issueLink: Jira.ExternalType.Webhook.IssueLinks,
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = issueLink.destinationIssueId;
  logger.info({ message: 'issueLinkHandler.invoked', data: { issueLink, requestId, resourceId } });
  try {
    //GET issue from elastic search
    const issueData = await getIssuesById(
      [issueLink.destinationIssueId, issueLink.sourceIssueId],
      organization,
      {
        requestId,
        resourceId,
      }
    );
    console.log('issueData', issueData);
    if (!issueData) {
      logger.error({
        message: 'issueLinkHandler.issueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
      throw new Error('issueData not found');
    }

    const destinationIssueData = issueData.find(
      (ele) => ele.issueId == issueLink.destinationIssueId
    );
    const sourceIssueIdData = issueData.find((ele) => ele.issueId == issueLink.sourceIssueId);
    if (!destinationIssueData && !sourceIssueIdData) {
      logger.error({
        message: 'issueLinkHandler.destinationIssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
      throw new Error('destinationIssue and sourceIssue data not found');
    }

    if (!destinationIssueData) {
      logger.error({
        message: 'issueLinkHandler.destinationIssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
    }

    if (!sourceIssueIdData) {
      logger.error({
        message: 'issueLinkHandler.sourceIssueIdNotFound',
        data: { issueLink, requestId, resourceId },
      });
    }

    if (destinationIssueData && sourceIssueIdData) {
      // Process destinationIssueData
      const destinationIssueDocId = destinationIssueData._id;
      const inwardIssueData = prepareInwardIssue(issueLink, sourceIssueIdData);
      destinationIssueData.issueLinks.push(inwardIssueData);
      logger.info({
        message: 'issueLinkHandler.issuelinks.length',
        data: { length: destinationIssueData.issueLinks.length },
      });
      // Process sourceIssueIdData
      const sourceIssueDocId = sourceIssueIdData._id;
      const outwardIssueData = prepareOutWardIssue(issueLink, destinationIssueData);
      sourceIssueIdData.issueLinks.push(outwardIssueData);
      logger.info({
        message: 'issueLinkHandler.issuelinks.length',
        data: { length: sourceIssueIdData.issueLinks.length },
      });
      await Promise.all([
        // Update the issue link data in the destination issue id
        await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, destinationIssueDocId, {
          body: { issueLinks: destinationIssueData.issueLinks },
        }),
        // Update the issue link data in the source issue id
        await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, sourceIssueDocId, {
          body: { issueLinks: sourceIssueIdData.issueLinks },
        }),
      ]);
    }
  } catch (error) {
    logger.error({
      message: 'issueLinkHandler.error',
      data: { resourceId, error: `${error}` },
    });
    throw error;
  }
}
