import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { Hit } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import { getIssuesById } from 'src/repository/issue/get-issue';

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
 * Updating/Create jira issue links.
 * destination issue id is inward
 * source issue id is outward
 */
export async function issueLinkCreateHandler(
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
    } else if (!destinationIssueData) {
      logger.error({
        message: 'issueLinkHandler.destinationIssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
    } else if (!sourceIssueIdData) {
      logger.error({
        message: 'issueLinkHandler.sourceIssueIdNotFound',
        data: { issueLink, requestId, resourceId },
      });
    } else {
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
      if (!checkIfIssueLinkExists(sourceIssueIdData, issueLink)) {
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
  issueLink: Jira.ExternalType.Webhook.IssueLinks,
  organization: string,
  requestId: string
): Promise<void> {
  const resourceId = issueLink.destinationIssueId;
  logger.info({
    message: 'issueLinkDeleteHandler.invoked',
    data: { issueLink, requestId, resourceId },
  });
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
        message: 'issueLinkDeleteHandler.issueDataNotFound',
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
        message: 'issueLinkDeleteHandler.destinationIssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
      throw new Error('destinationIssue and sourceIssue data not found');
    } else if (!destinationIssueData) {
      logger.error({
        message: 'issueLinDeleteHandler.destinationIssueDataNotFound',
        data: { issueLink, requestId, resourceId },
      });
    } else if (!sourceIssueIdData) {
      logger.error({
        message: 'issueLinkDeleteHandler.sourceIssueIdNotFound',
        data: { issueLink, requestId, resourceId },
      });
    } else {
      // Process destinationIssueData
      const destinationIssueDocId = destinationIssueData._id;
      const destIssueTypeDeleted = destinationIssueData.issueLinks.filter((ele: { id: string }) => {
        return ele.id !== issueLink.id;
      });
      destinationIssueData.issueLinks = destIssueTypeDeleted;
      logger.info({
        message: 'issueLinkDeleteHandler.issuelinks.length',
        data: { length: destinationIssueData.issueLinks.length },
      });
      // Update the issue link data in the destination issue id
      await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, destinationIssueDocId, {
        body: { issueLinks: destinationIssueData.issueLinks },
      });

      // Process sourceIssueIdData
      const sourceIssueDocId = sourceIssueIdData._id;

      const sourceIssueTypeDeleted = sourceIssueIdData.issueLinks.filter((ele: { id: string }) => {
        return ele.id !== issueLink.id;
      });
      sourceIssueIdData.issueLinks = sourceIssueTypeDeleted;
      logger.info({
        message: 'issueLinkDeleteHandler.issuelinks.length',
        data: { length: sourceIssueIdData.issueLinks.length },
      });

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
