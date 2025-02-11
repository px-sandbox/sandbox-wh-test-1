import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Jira, Other } from 'abstraction';
import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import _ from 'lodash';
import { logProcessToRetry } from 'rp';
import { mappingPrefixes } from 'src/constant/config';
import { getIssueById } from 'src/repository/issue/get-issue';
import { saveIssueDetails } from 'src/repository/issue/save-issue';
import { getBoardFromSprintId } from 'src/util/issue-helper';
import { getSprintForTo } from 'src/util/prepare-reopen-rate';
import { generateUuid } from 'src/util/response-formatter';
import { Queue } from 'sst/node/queue';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function fetchIssue(
  issueId: string,
  organization: string,
  reqCtx: Other.Type.RequestCtx
): Promise<Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody> {
  const issueData = await getIssueById(issueId, organization, {
    requestId: reqCtx.requestId,
    resourceId: reqCtx.resourceId,
  });
  if (!issueData) {
    logger.error({
      message: 'issueLinkHandler.issueDataNotFound',
      data: { issueId, reqCtx },
    });
    throw new Error('issueData not found');
  }
  return issueData;
}
async function updateSprintAndBoard(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDoc: any,
  issueDocId: string
) {
  const sprintId = getSprintForTo(item.to, item.from)
    ? `${mappingPrefixes.sprint}_${getSprintForTo(item.to, item.from)}`
    : null;
  const boardId = (await getBoardFromSprintId(sprintId))
    ? `${mappingPrefixes.board}_${await getBoardFromSprintId(item.to)}`
    : null;
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      sprintId,
      boardId,
    },
  });
  if (issueDoc.subtasks.length > 0) {
    // update subtask for with parent's sprintId
    const sprintScript = esb
      .script(
        'inline',
        `ctx._source.body.sprintId = params.sprintId; ctx._source.body.boardId = params.boardId`
      )
      .params({ sprintId, boardId });
    const subtaskQuery = esb
      .requestBodySearch()
      .query(esb.termQuery('body.parent.id', issueDoc.id))
      .toJSON();
    await esClientObj.updateByQuery(Jira.Enums.IndexName.Issue, subtaskQuery, sprintScript);
  }
}
async function updateLabels(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  const labels = item.toString.split(' ');
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      isFTP: labels.includes('FTP') ? true : false,
      isFTF: labels.includes('FTF') ? true : false,
    },
  });
}
async function updateDescription(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      description: item.toString,
    },
  });
}
async function updateSummary(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      summary: item.toString,
    },
  });
}
async function updateDevRca(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      rcaData: { devRca: `${mappingPrefixes.rca}_${item.to}` },
    },
  });
}

async function updateIssueStatus(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string,
  issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody,
  { requestId, resourceId }: Other.Type.RequestCtx
) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      status: item.toString,
    },
  });
  // update cycle time
  await sqsClient.sendFifoMessage(
    { ...issueData },
    Queue.qCycleTimeFormat.queueUrl,
    { requestId, resourceId },
    issueData.issueKey,
    generateUuid()
  );
}

async function updateAssignee(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      assigneeId: `${mappingPrefixes.user}_${item.to}`,
    },
  });
}

async function updatePriority(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      priority: item.toString,
    },
  });
}

async function updateQARca(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      rcaData: { qaRca: `${mappingPrefixes.rca}_${item.to}` },
    },
  });
}

async function handleIssueChangelogs(
  changelog: { items: Jira.ExternalType.Webhook.ChangelogItem[] },
  issueData: Jira.ExternalType.Webhook.newIssue,
  organization: string,
  reqCtx: { requestId: string; resourceId: string },
  processId: string
): Promise<void> {
  const issueDoc = await fetchIssue(issueData.id, organization, reqCtx);
  const issueDocId = issueDoc._id;
  changelog.items.forEach(async (item) => {
    const field = item.fieldId || item.field;
    switch (field) {
      case Jira.Enums.ChangelogName.SPRINT:
        await updateSprintAndBoard(item, issueDoc, issueDocId);
        break;
      case Jira.Enums.ChangelogName.STATUS:
        //also incorporate cycle time
        await updateIssueStatus(item, issueDocId, issueDoc, reqCtx);
        break;
      case Jira.Enums.ChangelogName.ASSIGNEE:
        await updateAssignee(item, issueDocId);
        break;
      case Jira.Enums.ChangelogName.SUMMARY:
        //worklogs category
        await updateSummary(item, issueDocId);
        break;
      case Jira.Enums.ChangelogName.DESCRIPTION:
        await updateDescription(item, issueDocId);
        break;
      case Jira.Enums.ChangelogName.PRIORITY:
        await updatePriority(item, issueDocId);
        break;
      case Jira.Enums.ChangelogName.LABELS:
        await updateLabels(item, issueDocId);
        break;
      case Jira.Enums.ChangelogName.ISSUE_TYPE:
        break;
      case Jira.Enums.ChangelogName.ISSUE_PARENT_ASSOCIATION:
        //changelog contains parentId and issueData contains subtask.
        // update parent task with subtask id
        {
          const parentIssue = await fetchIssue(item.to, organization, reqCtx);
          const parentIssueId = parentIssue._id;
          await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, parentIssueId, {
            body: {
              subtasks: [
                ...parentIssue.subtasks,
                { id: `${mappingPrefixes.issue}_${issueData.id}`, key: issueData.key },
              ],
            },
          });
        }
        break;
      case Jira.Enums.ChangelogName.DEV_RCA:
        await updateDevRca(item, issueDocId);
        break;
      case Jira.Enums.ChangelogName.QA_RCA:
        await updateQARca(item, issueDocId);
        break;
    }
  });
}
/**
 * Formats the issue data received from an SQS record.
 * @param record - The SQS record containing the issue data.
 * @returns A Promise that resolves to void.
 */
async function save(record: SQSRecord): Promise<void> {
  const { reqCtx, message: messageBody, processId } = JSON.parse(record.body);

  try {
    logger.info({
      requestId: reqCtx.requestId,
      resourceId: reqCtx.resourceId,
      message: 'ISSUE_SQS_RECEIVER_HANDLER',
      data: messageBody,
    });

    switch (messageBody.eventName) {
      case Jira.Enums.Event.IssueCreated:
        await saveIssueDetails(messageBody.issueData, reqCtx, processId);
        break;
      case Jira.Enums.Event.IssueUpdated:
        // changelogs switch cases for every field changes
        await handleIssueChangelogs(
          messageBody.changelog,
          messageBody.issueInfo,
          messageBody.organization,
          reqCtx,
          processId
        );
        break;
      case Jira.Enums.Event.IssueDeleted:
        // await issueProcessorDelete.delete();
        break;
      default:
        logger.error({
          requestId: reqCtx.requestId,
          resourceId: reqCtx.resourceId,
          message: 'ISSUE_SQS_RECEIVER_HANDLER',
          error: 'Unknown event type',
        });
        break;
    }
  } catch (error) {
    await logProcessToRetry(record, Queue.qIssueFormat.queueUrl, error as Error);
    logger.error({
      requestId: reqCtx.requestId,
      resourceId: reqCtx.resourceId,
      message: 'issueFormattedDataReceiver.error',
      error: `${error}`,
    });
  }
}

/**
 * Handles the formatted data received from an SQS event.
 * @param event - The SQS event containing the formatted data.
 * @returns A Promise that resolves to void.
 */
export const handler = async function issueFormattedDataReceiver(event: SQSEvent): Promise<void> {
  const messageGroups = _.groupBy(event.Records, (record) => record.attributes.MessageGroupId);
  await Promise.all(
    Object.values(messageGroups).map(
      async (group) =>
        new Promise((resolve) => {
          async.eachSeries(
            group,
            async (record) => {
              await save(record);
            },
            (error) => {
              if (error) {
                logger.error({ message: 'issueFormattedDataReceiver.error', error });
              }
              resolve('DONE');
            }
          );
        })
    )
  );
};
