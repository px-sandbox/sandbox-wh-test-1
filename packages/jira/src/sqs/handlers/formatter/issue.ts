import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { ChangelogStatus, validChangelogFields } from 'abstraction/jira/enums';
import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import _ from 'lodash';
import moment from 'moment';
import { deleteProcessfromDdb, logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { mappingPrefixes } from '../../../constant/config';
import { softDeleteCycleTimeDocument } from '../../../repository/cycle-time/update';
import {
  getIssueById,
  getParentChildIssues,
  getReopenRateDataById,
} from '../../../repository/issue/get-issue';
import { saveIssueDetails } from '../../../repository/issue/save-issue';
import { saveReOpenRate } from '../../../repository/issue/save-reopen-rate';
import { formatReopenRateData, getBoardFromSprintId } from '../../../util/issue-helper';
import { getIssueStatusForReopenRate } from '../../../util/issue-status';
import { getSprintForTo } from '../../../util/prepare-reopen-rate';
import { removeReopenRate } from '../../../webhook/issues/delete-reopen-rate';

const esClientObj = ElasticSearchClient.getInstance();

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
    throw new Error(`issueData not found_for_${issueId}`);
  }
  return issueData;
}

async function updateActualTime(
  worklogData: Jira.ExternalType.Webhook.Worklog,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  logger.info({ message: 'updateActualTime.initiated', data: worklogData });
  const issueData = await fetchIssue(worklogData.issueId, worklogData.organization, reqCtx);
  const issueDocId = issueData._id;
  logger.info({ message: 'updateActualTime.issueFetched', data: { issueKey: issueData.issueKey } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      timeTracker: {
        actual: worklogData.worklog.timeSpentSeconds,
      },
    },
  });
  logger.info({ message: 'updateActualTime.completed', data: { issueDocId } });
}
async function updateSprintAndBoard(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDoc: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody
): Promise<void> {
  logger.info({ message: 'updateSprintAndBoard.initiated', data: { issueKey: issueDoc.issueKey } });
  const sprintId = getSprintForTo(item.to, item.from);
  const boardId = await getBoardFromSprintId(sprintId);
  const sprintWithMapping = sprintId ? `${mappingPrefixes.sprint}_${sprintId}` : null;

  logger.info({
    message: 'updateSprintAndBoard.sprint.computed',
    data: { issueKey: issueDoc.issueKey, sprintId, boardId },
  });

  const sprintScript = esb
    .script(
      'inline',
      `ctx._source.body.sprintId = params.sprintWithMapping; ctx._source.body.boardId = params.boardId`
    )
    .params({ sprintWithMapping, boardId });
  const subtaskQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .should([
          esb.termsQuery('body.parent.key', issueDoc.issueKey),
          esb.termsQuery('body.issueKey', issueDoc.issueKey),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();

  await esClientObj.updateByQuery(Jira.Enums.IndexName.Issue, subtaskQuery, sprintScript);

  logger.info({
    message: 'updateSprintAndBoard.sprint.completed',
    data: { issueKey: issueDoc.issueKey },
  });
}

async function updateLabels(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateLabels.initiated', data: { issueDocId } });
  const labels = item.toString.split(' ');
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      isFTP: !!labels.includes('FTP'),
      isFTF: !!labels.includes('FTF'),
      label: labels,
    },
  });
  logger.info({ message: 'updateLabels.completed', data: { issueDocId } });
}

async function updateDescription(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateDescription.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      description: item.toString,
    },
  });
  logger.info({ message: 'updateDescription.completed', data: { issueDocId } });
}

async function updateSummary(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateSummary.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      summary: item.toString,
    },
  });
  logger.info({ message: 'updateSummary.completed', data: { issueDocId } });
}

async function createReOpenRate(
  issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  logger.info({ message: 'createReOpenRate.initiated', data: issueData });
  const reopenRateData = await formatReopenRateData(issueData);
  logger.info({ message: 'createReOpenRate.formatted.data', data: JSON.stringify(reopenRateData) });
  await saveReOpenRate(reopenRateData, reqCtx);
  logger.info({ message: 'createReOpenRate.completed', data: issueData });
}

async function updateIssueStatus(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string,
  issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody,
  { requestId, resourceId }: Other.Type.RequestCtx
): Promise<void> {
  logger.info({ message: 'updateIssueStatus.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      status: item.toString,
    },
  });

  logger.info({ message: 'updateIssueStatus.issueDocument.updated', data: { issueDocId } });

  if (issueData.issueType === Jira.Enums.IssuesTypes.BUG) {
    logger.info({ message: 'updateIssueStatus.issueType.BUG', data: { issueDocId } });

    const orgId = issueData.organizationId.split('jira_org_')[1];
    const issueStatus = await getIssueStatusForReopenRate(
      `${mappingPrefixes.organization}_${orgId}`,
      {
        requestId,
        resourceId,
      }
    );
    if (issueStatus[ChangelogStatus.READY_FOR_QA] === item.to) {
      const checkReOpenRate = await getReopenRateDataById(
        `${mappingPrefixes.reopen_rate}_${issueData.issueId}_${issueData.sprintId}`,
        issueData.organizationId,
        {
          requestId,
          resourceId,
        }
      );
      logger.info({
        message: 'updateIssueStatus.issueStatus.READY_FOR_QA',
        data: { issueDocId, isReopenRateExists: JSON.stringify(checkReOpenRate) },
      });
      if (!checkReOpenRate) {
        await createReOpenRate(issueData, { requestId, resourceId });
      }
    } else if (issueStatus[ChangelogStatus.QA_FAILED] === item.to) {
      logger.info({
        message: 'updateIssueStatus.issueStatus.QA_FAILED',
        data: JSON.stringify(issueData),
      });
      const reOpenRateData = await getReopenRateDataById(
        `${mappingPrefixes.reopen_rate}_${issueData.issueId}_${issueData.sprintId}`,
        issueData.organizationId,
        {
          requestId,
          resourceId,
        }
      );
      if (reOpenRateData) {
        const reopenDocId = reOpenRateData._id;
        await esClientObj.updateDocument(Jira.Enums.IndexName.ReopenRate, reopenDocId, {
          body: {
            isReopen: true,
            reOpenCount: reOpenRateData.reOpenCount + 1,
          },
        });
        logger.info({ message: 'Reopen rate updated', data: { reopenDocId } });
      } else {
        logger.error({
          requestId,
          resourceId,
          message: 'issue_info_ready_for_QA_update_event: Reopen rate data not found',
        });
      }
    }
  }
  logger.info({ message: 'updateStatus.completed', data: { issueDocId } });
}

async function updateAssignee(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateAssignee.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      assigneeId: `${mappingPrefixes.user}_${item.to}`,
    },
  });
  logger.info({ message: 'updateAssignee.completed', data: { issueDocId } });
}

async function updateReporter(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateReporter.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      reporterId: `${mappingPrefixes.user}_${item.to}`,
    },
  });
  logger.info({ message: 'updateReporter.completed', data: { issueDocId } });
}

async function updateCreator(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateReporter.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      creatorId: `${mappingPrefixes.user}_${item.to}`,
    },
  });
  logger.info({ message: 'updateReporter.completed', data: { issueDocId } });
}

async function updatePriority(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updatePriority.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      priority: item.toString,
    },
  });
  logger.info({ message: 'updatePriority.completed', data: { issueDocId } });
}

async function updateDevRca(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateDevRca.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      rcaData: { devRca: `${mappingPrefixes.rca}_${item.to}` },
    },
  });
  logger.info({ message: 'updateDevRca.completed', data: { issueDocId } });
}

async function updateQARca(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateQARca.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      rcaData: { qaRca: `${mappingPrefixes.rca}_${item.to}` },
    },
  });
  logger.info({ message: 'updateQARca.completed', data: { issueDocId } });
}

async function updateIssueType(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateIssueType.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      issueType: item.toString,
    },
  });
  logger.info({ message: 'updateIssueType.completed', data: { issueDocId } });
}

async function updateIssueParentAssociation(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueData: Jira.ExternalType.Webhook.Issue,
  organization: string,
  reqCtx: { requestId: string; resourceId: string }
): Promise<void> {
  logger.info({ message: 'updateIssueParentAssociation.initiated', data: { issueData, item } });
  const issues = await getParentChildIssues(item.to, issueData.id, organization, reqCtx);
  const parentIssue: Other.Type.HitBody | undefined = issues.find(
    (issue: Other.Type.HitBody) => issue.issueId === item.to
  );
  const childIssue: Other.Type.HitBody | undefined = issues.find(
    (issue: Other.Type.HitBody) => issue.issueKey === issueData.key
  );
  logger.info({
    message: 'updateIssueParentAssociation.issues.data',
    data: { parentIssue, childIssue },
  });
  if (parentIssue) {
    await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, parentIssue._id, {
      body: {
        subtasks: [
          ...parentIssue.subtasks,
          { id: `${mappingPrefixes.issue}_${issueData.id}`, key: issueData.key },
        ],
      },
    });
  }
  if (childIssue && parentIssue) {
    logger.info({
      message: 'updateIssueParentAssociation.childIssue',
      data: { childIssue, parentIssue },
    });
    if (childIssue.parent.id != null) {
      logger.info({
        message: 'updateIssueParentAssociation.childIssue.parentId.exists',
        data: { parent: childIssue.parent },
      });
    } else {
      await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, childIssue._id, {
        body: {
          parent: { id: `${mappingPrefixes.issue}_${item.to}`, key: parentIssue.issueKey },
        },
      });
    }
  }
  logger.info({ message: 'updateIssueParentAssociation.completed', data: { issueData } });
}

async function updateTimeTracker(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
): Promise<void> {
  logger.info({ message: 'updateTimeTracker.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      timeTracker: { estimate: parseInt(item.to, 10) },
    },
  });
  logger.info({ message: 'updateTimeTracker.completed', data: { issueDocId } });
}
function changelogsToProcess(
  changelogs: Jira.ExternalType.Webhook.ChangelogItem[]
): Jira.ExternalType.Webhook.ChangelogItem {
  const [item] = changelogs.filter(
    (items) =>
      validChangelogFields.includes(items.field) || validChangelogFields.includes(items.fieldId)
  );
  logger.info({ message: 'changelogsToProcess', data: { changelogs, item } });
  return item;
}
async function handleIssueUpdate(
  changelog: { items: Jira.ExternalType.Webhook.ChangelogItem[] },
  issueData: Jira.ExternalType.Webhook.Issue,
  organization: string,
  reqCtx: { requestId: string; resourceId: string }
): Promise<void> {
  logger.info({ message: 'handleIssueUpdate.initiated', data: { issueData } });
  try {
    const item = changelogsToProcess(changelog.items);
    if (!item) {
      logger.info({
        message: 'handleIssueUpdate.invalid.changelog',
        data: { changelog, issueData },
      });
      return;
    }
    const field = item.fieldId || item.field;
    logger.info({ message: 'handleIssueUpdate.field.toBeUpdated', data: { field } });
    if (field === Jira.Enums.ChangelogName.ISSUE_PARENT_ASSOCIATION) {
      logger.info({ message: 'handleIssueUpdate.parentAssociation', data: { field } });
      // changelog contains parentId and issueData contains subtask.
      // update parent task with subtask id
      await updateIssueParentAssociation(item, issueData, organization, reqCtx);
    } else {
      const issueDoc = await fetchIssue(issueData.id, organization, reqCtx);
      const issueDocId = issueDoc._id;
      logger.info({ message: 'handleIssueUpdate.issueDocId', data: { issueDocId, field } });
      switch (field) {
        case Jira.Enums.ChangelogName.SPRINT:
          await updateSprintAndBoard(item, issueDoc);
          break;
        case Jira.Enums.ChangelogName.STATUS:
          // also incorporate cycle time and on ready for qa create index in reopenrate
          await updateIssueStatus(item, issueDocId, issueDoc, reqCtx);
          break;
        case Jira.Enums.ChangelogName.ASSIGNEE:
          await updateAssignee(item, issueDocId);
          break;
        case Jira.Enums.ChangelogName.REPORTER:
          await updateReporter(item, issueDocId);
          break;
        case Jira.Enums.ChangelogName.CREATOR:
          await updateCreator(item, issueDocId);
          break;
        case Jira.Enums.ChangelogName.SUMMARY:
          // worklogs category
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
          await updateIssueType(item, issueDocId);
          break;
        case Jira.Enums.ChangelogName.DEV_RCA:
          await updateDevRca(item, issueDocId);
          break;
        case Jira.Enums.ChangelogName.QA_RCA:
          await updateQARca(item, issueDocId);
          break;
        case Jira.Enums.ChangelogName.TIME_TRACKER:
          await updateTimeTracker(item, issueDocId);
          break;
        default:
          logger.error({
            requestId: reqCtx.requestId,
            resourceId: reqCtx.resourceId,
            message: 'ISSUE_SQS_RECEIVER_HANDLER',
            error: 'unknown_changelog_type',
            data: item,
          });
          break;
      }
    }
  } catch (error) {
    throw new Error('unknown_changelog_type_error');
  }
}

async function deleteIssueCycleTimeAndReOpenRate(
  issueData: Jira.ExternalType.Webhook.Issue,
  organization: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  logger.info({ message: 'deleteIssueCycleTimeAndReOpenRate.initiated', data: issueData });
  const issueDoc = await fetchIssue(issueData.id, organization, reqCtx);
  const issueDocId = issueDoc._id;
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      isDeleted: true,
      deletedAt: moment().toISOString(),
    },
  });
  logger.info({
    message: 'issueDelete.completed',
    data: issueData,
  });

  if (issueDoc.parent.id) {
    const parentId = issueDoc.parent.id.replace('jira_issue_', '');
    logger.info({ message: 'issueDelete.subtask.initiated', data: { parentId } });
    const parentIssue = await fetchIssue(parentId, organization, reqCtx);
    const parentIssueId = parentIssue._id;
    await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, parentIssueId, {
      body: {
        subtasks: parentIssue.subtasks.filter(
          (subtask: { id: string }) => subtask.id !== `${mappingPrefixes.issue}_${issueData.id}`
        ),
      },
    });
    logger.info({
      message: 'issueDelete.subtask.completed',
      data: issueData,
    });
  }
  // soft delete cycle time document
  await softDeleteCycleTimeDocument(
    issueData.id,
    issueData.fields.issuetype.name,
    organization,
    issueData?.fields.parent?.id
  );

  if (issueData.fields.issuetype.name === Jira.Enums.IssuesTypes.BUG) {
    //  remove reopen rate
    logger.info({ message: 'deleteIssueCycleTimeAndReOpenRate.removeReopenRate', data: issueData });
    await removeReopenRate(issueData.id, moment().toISOString(), reqCtx);
  }

  logger.info({ message: 'deleteIssueCycleTimeAndReOpenRate.completed', data: issueData });
}

/**
 * Formats the issue data received from an SQS record.
 * @param record - The SQS record containing the issue data.
 * @returns A Promise that resolves to void.
 */
async function save(record: SQSRecord): Promise<void> {
  const { reqCtx, message: messageBody } = JSON.parse(record.body);
  try {
    logger.info({
      requestId: reqCtx.requestId,
      resourceId: reqCtx.resourceId,
      message: 'ISSUE_SQS_RECEIVER_HANDLER',
      data: messageBody,
    });
    switch (messageBody.eventName) {
      case Jira.Enums.Event.IssueCreated:
        logger.info({ message: 'ISSUE_CREATE_EVENT', data: messageBody.issueData.key });
        await saveIssueDetails(messageBody.issueData, reqCtx);
        break;
      case Jira.Enums.Event.IssueUpdated:
        logger.info({ message: 'ISSUE_UPDATED_EVENT', data: messageBody.issueInfo.key });
        await handleIssueUpdate(
          messageBody.changelog,
          messageBody.issueInfo,
          messageBody.organization,
          reqCtx
        );
        break;
      case Jira.Enums.Event.IssueDeleted:
        logger.info({ message: 'ISSUE_DELETE_EVENT', data: messageBody.issueInfo.key });
        await deleteIssueCycleTimeAndReOpenRate(
          messageBody.issueInfo,
          messageBody.organization,
          reqCtx
        );
        break;
      case Jira.Enums.Event.WorklogCreated:
      case Jira.Enums.Event.WorklogUpdated:
      case Jira.Enums.Event.WorklogDeleted:
        logger.info({ message: 'WORKLOGS_EVENT', data: messageBody.worklog });
        await updateActualTime(messageBody, reqCtx);
        break;
      default:
        logger.error({
          requestId: reqCtx.requestId,
          resourceId: reqCtx.resourceId,
          message: 'ISSUE_SQS_RECEIVER_HANDLER',
          error: 'Unknown_event_type',
          data: messageBody.eventName,
        });
        break;
    }
    await deleteProcessfromDdb(messageBody.processId, reqCtx);
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
