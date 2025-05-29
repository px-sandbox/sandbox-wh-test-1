import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { Hit } from 'abstraction/github/type';
import { IssuesTypes } from 'abstraction/jira/enums';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { getIssuesById } from '../../repository/issue/get-issue';

const esClientObj = ElasticSearchClient.getInstance();

function prepareInwardIssue(sourceIssueId: Pick<Hit, '_id'> & HitBody): object {
  return {
    id: `${mappingPrefixes.issue}_${sourceIssueId.issueId}`,
    key: sourceIssueId.issueKey,
    type: sourceIssueId.issueType,
    relation: 'inward',
  };
}

function prepareOutWardIssue(destIssueId: Pick<Hit, '_id'> & HitBody): object {
  return {
    id: `${mappingPrefixes.issue}_${destIssueId.issueId}`,
    key: destIssueId.issueKey,
    type: destIssueId.issueType,
    relation: 'outward',
  };
}

function checkIfIssueLinkExists(
  esbData: (Pick<Hit, '_id'> & HitBody) | undefined,
  issueLink: Jira.ExternalType.Webhook.IssueLinkType
): boolean {
  const issueLinkData = esbData?.issueLinks;
  const issueLinkExists = issueLinkData.find((ele: { id: string }) => ele.id === issueLink.id);
  return issueLinkExists;
}
/**
 * Updating/Create jira issue links.
 * destination issue id is inward
 * source issue id is outward
 */
// eslint-disable-next-line max-lines-per-function
export async function issueLinkCreateHandler(
  issueLink: Jira.ExternalType.Webhook.IssueLinkType,
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = issueLink.destinationIssueId;
  logger.info({ message: 'issueLinkHandler.invoked', data: { issueLink, requestId, resourceId } });
  try {
    // GET issue from elastic search
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
      (ele) => ele.issueId === issueLink.destinationIssueId
    );
    const sourceIssueIdData = issueData.find((ele) => ele.issueId === issueLink.sourceIssueId);
    if (!destinationIssueData && !sourceIssueIdData) {
      logger.error({
        message: 'issueLinkHandler.destinationIssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
      throw new Error('destinationIssue and sourceIssue data not found');
    } else if (!destinationIssueData || !sourceIssueIdData) {
      logger.error({
        message: 'issueLinkHandler.destination_source_IssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
    } else {
      const destinationIssueDocId = destinationIssueData._id;
      if (!checkIfIssueLinkExists(destinationIssueData, issueLink)) {
        const inwardIssueData = prepareInwardIssue(sourceIssueIdData);
        destinationIssueData.issueLinks.push(inwardIssueData);
        logger.info({
          message: 'issueLinkHandler.issuelinks.length',
          data: { length: destinationIssueData.issueLinks.length },
        });
        // Update the issue link data in the destination issue id
        let sourceActualTime = 0;
        if (sourceIssueIdData.issueType === IssuesTypes.BUG) {
          sourceActualTime =
            destinationIssueData.bugTimeTracker.actual + sourceIssueIdData.timeTracker.actual;
          await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, destinationIssueDocId, {
            body: {
              issueLinks: destinationIssueData.issueLinks,
              bugTimeTracker: { actual: sourceActualTime },
            },
          });
        }
        await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, destinationIssueDocId, {
          body: {
            issueLinks: destinationIssueData.issueLinks,
          },
        });
      } else {
        logger.error({
          message: 'issueLinkHandler.destinationIssue_source_issue_Link_already_exists',
          data: { sourceId: issueLink.sourceIssueId, requestId, resourceId },
        });
      }
      // Process sourceIssueIdData
      const sourceIssueDocId = sourceIssueIdData._id;
      if (!checkIfIssueLinkExists(sourceIssueIdData, issueLink)) {
        const outwardIssueData = prepareOutWardIssue(destinationIssueData);
        sourceIssueIdData.issueLinks.push(outwardIssueData);
        logger.info({
          message: 'issueLinkHandler.issuelinks.length',
          data: { length: sourceIssueIdData.issueLinks.length },
        });
        let sourceActualTime = 0;
        if (destinationIssueData.issueType === IssuesTypes.BUG) {
          sourceActualTime =
            destinationIssueData.bugTimeTracker.actual + sourceIssueIdData.timeTracker.actual;
          await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, sourceIssueDocId, {
            body: {
              issueLinks: destinationIssueData.issueLinks,
              bugTimeTracker: { actual: sourceActualTime },
            },
          });
        }
        // Update the issue link data in the source issue id
        await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, sourceIssueDocId, {
          body: { issueLinks: sourceIssueIdData.issueLinks },
        });
      } else {
        logger.error({
          message: 'issueLinkHandler.source_issue_Link_already_exists',
          data: { sourceId: issueLink.sourceIssueId, requestId, resourceId },
        });
      }
    }
  } catch (error) {
    logger.error({
      message: 'issueLinkHandler.error',
      data: { resourceId, error: `${error}` },
    });
    throw error;
  }
}

/**
 * Delete jira issue links.
 * destination issue id is inward
 * source issue id is outward
 */
export async function issueLinkDeleteHandler(
  issueLink: Jira.ExternalType.Webhook.IssueLinkType,
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = issueLink.destinationIssueId;
  logger.info({
    message: 'issueLinkDeleteHandler.invoked',
    data: { issueLink, requestId, resourceId },
  });
  try {
    // GET issue from elastic search
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
        message: 'issueLinkDeleteHandler.issueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
      throw new Error('issueData not found');
    }
    const destinationIssueData = issueData.find(
      (ele) => ele.issueId === issueLink.destinationIssueId
    );
    const sourceIssueIdData = issueData.find((ele) => ele.issueId === issueLink.sourceIssueId);
    if (!destinationIssueData && !sourceIssueIdData) {
      logger.error({
        message: 'issueLinkDeleteHandler.destinationIssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
      throw new Error('destinationIssue and sourceIssue data not found');
    } else if (!destinationIssueData || !sourceIssueIdData) {
      logger.error({
        message: 'issueLinkDeleteHandler.destination_source_IssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
    } else {
      // Process destinationIssueData
      const destinationIssueDocId = destinationIssueData._id;

      const destIssueTypeDeleted = destinationIssueData.issueLinks.filter(
        (ele: { id: string }) =>
          ele.id !== String(`${mappingPrefixes.issue}_${issueLink.sourceIssueId}`)
      );

      destinationIssueData.issueLinks = destIssueTypeDeleted;
      logger.info({
        message: 'issueLinkDeleteHandler.issuelinks.length',
        data: { length: destinationIssueData.issueLinks.length },
      });

      if (sourceIssueIdData.issueType === IssuesTypes.BUG) {
        const sourceActualTime =
          destinationIssueData.bugTimeTracker.actual - sourceIssueIdData.timeTracker.actual;
        await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, destinationIssueDocId, {
          body: {
            issueLinks: destinationIssueData.issueLinks,
            bugTimeTracker: { actual: sourceActualTime },
          },
        });
      }
      // Update the issue link data in the destination issue id
      await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, destinationIssueDocId, {
        body: { issueLinks: destinationIssueData.issueLinks },
      });

      // Process sourceIssueIdData
      const sourceIssueDocId = sourceIssueIdData._id;

      const sourceIssueTypeDeleted = sourceIssueIdData.issueLinks.filter(
        (ele: { id: string }) =>
          ele.id !== String(`${mappingPrefixes.issue}_${issueLink.destinationIssueId}`)
      );
      sourceIssueIdData.issueLinks = sourceIssueTypeDeleted;
      logger.info({
        message: 'issueLinkDeleteHandler.issuelinks.length',
        data: { length: sourceIssueIdData.issueLinks.length },
      });
      if (destinationIssueData.issueType === IssuesTypes.BUG) {
        const sourceActualTime =
          destinationIssueData.bugTimeTracker.actual - sourceIssueIdData.timeTracker.actual;
        await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, sourceIssueDocId, {
          body: {
            issueLinks: sourceIssueIdData.issueLinks,
            bugTimeTracker: { actual: sourceActualTime },
          },
        });
      }
      // Update the issue link data in the source issue id
      await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, sourceIssueDocId, {
        body: { issueLinks: sourceIssueIdData.issueLinks },
      });
    }
  } catch (error) {
    logger.error({
      message: 'issueLinkDeleteHandler.error',
      data: { resourceId, error: `${error}` },
    });
    throw error;
  }
}
