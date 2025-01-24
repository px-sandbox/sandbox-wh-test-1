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

function checkIfIssueLinkExists(
  esbData: (Pick<Hit, '_id'> & HitBody) | undefined,
  issueLink: Jira.ExternalType.Webhook.IssueLinks
) {
  const issueLinkData = esbData?.issueLinks;
  const issueLinkExists = issueLinkData.find((ele: { id: string }) => ele.id === issueLink.id);
  return issueLinkExists;
}
/**
 * Updating jira issue links.
 * destination issue id is inward
 * source issue id is outward
 */
export async function issueLinkHandler(
  issueLink: Jira.ExternalType.Webhook.IssueLinks,
  eventName: string,
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
    logger.info({ message: 'issue link event name', data: { eventName } });
    switch (eventName) {
      case Jira.Enums.Event.IssueLinkCreated:
        if (destinationIssueData && sourceIssueIdData) {
          // Process destinationIssueData
          const destinationIssueDocId = destinationIssueData._id;
          if (!checkIfIssueLinkExists(destinationIssueData, issueLink)) {
            const inwardIssueData = prepareInwardIssue(issueLink, sourceIssueIdData);
            destinationIssueData.issueLinks.push(inwardIssueData);
            logger.info({
              message: 'issueLinkHandler.issuelinks.length',
              data: { length: destinationIssueData.issueLinks.length },
            });
            // Update the issue link data in the destination issue id
            await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, destinationIssueDocId, {
              body: { issueLinks: destinationIssueData.issueLinks },
            });
          } else {
            logger.error({
              message: 'issueLinkHandler.destinationIssue_source_issue_Link_already_exists',
              data: { sourceId: issueLink.sourceIssueId, requestId, resourceId },
            });
          }
          // Process sourceIssueIdData
          const sourceIssueDocId = sourceIssueIdData._id;
          if (!checkIfIssueLinkExists(destinationIssueData, issueLink)) {
            const outwardIssueData = prepareOutWardIssue(issueLink, destinationIssueData);
            sourceIssueIdData.issueLinks.push(outwardIssueData);
            logger.info({
              message: 'issueLinkHandler.issuelinks.length',
              data: { length: sourceIssueIdData.issueLinks.length },
            });

            // Update the issue link data in the source issue id
            await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, sourceIssueDocId, {
              body: { issueLinks: sourceIssueIdData.issueLinks },
            });
          } else {
            logger.error({
              message: 'issueLinkHandler.destinationIssue_source_issue_Link_already_exists',
              data: { sourceId: issueLink.sourceIssueId, requestId, resourceId },
            });
          }
        }
        break;
      case Jira.Enums.Event.IssueLinkDeleted:
        if (destinationIssueData && sourceIssueIdData) {
          // Process destinationIssueData
          const destinationIssueDocId = destinationIssueData._id;
          const destIssueTypeDeleted = destinationIssueData.issueLinks.filter(
            (ele: { id: string }) => {
              return ele.id !== issueLink.id;
            }
          );
          destinationIssueData.issueLinks = destIssueTypeDeleted;
          logger.info({
            message: 'issueLinkHandler.issuelinks.length',
            data: { length: destinationIssueData.issueLinks.length },
          });
          // Update the issue link data in the destination issue id
          await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, destinationIssueDocId, {
            body: { issueLinks: destinationIssueData.issueLinks },
          });

          // Process sourceIssueIdData
          const sourceIssueDocId = sourceIssueIdData._id;

          const sourceIssueTypeDeleted = sourceIssueIdData.issueLinks.filter(
            (ele: { id: string }) => {
              return ele.id !== issueLink.id;
            }
          );
          sourceIssueIdData.issueLinks = sourceIssueTypeDeleted;
          logger.info({
            message: 'issueLinkHandler.issuelinks.length',
            data: { length: sourceIssueIdData.issueLinks.length },
          });

          // Update the issue link data in the source issue id
          await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, sourceIssueDocId, {
            body: { issueLinks: sourceIssueIdData.issueLinks },
          });
        }
        break;
      default:
        logger.info({
          message: `No case found in issueLink handler for ${eventName} in Jira webhook event`,
          data: { eventName, resourceId },
        });
    }
  } catch (error) {
    logger.error({
      message: 'issueLinkHandler.error',
      data: { resourceId, error: `${error}` },
    });
    throw error;
  }
}
