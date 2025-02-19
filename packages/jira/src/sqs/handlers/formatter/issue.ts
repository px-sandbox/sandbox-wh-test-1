import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { ChangelogStatus, validChangelogFields } from 'abstraction/jira/enums';
import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import _ from 'lodash';
import moment from 'moment';
import { logProcessToRetry } from 'rp';
import { mappingPrefixes } from 'src/constant/config';
import { softDeleteCycleTimeDocument } from 'src/repository/cycle-time/update';
import { getIssueById, getReopenRateDataById } from 'src/repository/issue/get-issue';
import { saveIssueDetails } from 'src/repository/issue/save-issue';
import { saveReOpenRate } from 'src/repository/issue/save-reopen-rate';
import { formatReopenRateData, getBoardFromSprintId } from 'src/util/issue-helper';
import { getIssueStatusForReopenRate } from 'src/util/issue-status';
import { getSprintForTo } from 'src/util/prepare-reopen-rate';
import { removeReopenRate } from 'src/webhook/issues/delete-reopen-rate';
import { Queue } from 'sst/node/queue';

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
) {
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
async function updateSprintAndBoard(item: Jira.ExternalType.Webhook.ChangelogItem, issueDoc: any) {
  logger.info({ message: 'updateSprintAndBoard.initiated', data: { issueKey: issueDoc.key } });

  const sprintId = getSprintForTo(item.to, item.from);
  const boardId = await getBoardFromSprintId(sprintId);
  const sprintWithMapping = sprintId ? `${mappingPrefixes.sprint}_${sprintId}` : null;

  logger.info({
    message: 'updateSprintAndBoard.sprint.computed',
    data: { issueKey: issueDoc.key, sprintId, boardId },
  });

  const sprintScript = esb
    .script(
      'inline',
      `ctx._source.body.sprintId = params.sprintId; ctx._source.body.boardId = params.boardId`
    )
    .params({ sprintWithMapping, boardId });
  const subtaskQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .should([
          esb.termsQuery('body.parent.key', issueDoc.key),
          esb.termsQuery('body.issueKey', issueDoc.key),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();

  await esClientObj.updateByQuery(Jira.Enums.IndexName.Issue, subtaskQuery, sprintScript);

  logger.info({
    message: 'updateSprintAndBoard.sprint.completed',
    data: { issueKey: issueDoc.key },
  });
}

async function updateLabels(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  logger.info({ message: 'updateLabels.initiated', data: { issueDocId } });
  const labels = item.toString.split(' ');
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      isFTP: labels.includes('FTP') ? true : false,
      isFTF: labels.includes('FTF') ? true : false,
      label: labels,
    },
  });
  logger.info({ message: 'updateLabels.completed', data: { issueDocId } });
}

async function updateDescription(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
) {
  logger.info({ message: 'updateDescription.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      description: item.toString,
    },
  });
  logger.info({ message: 'updateDescription.completed', data: { issueDocId } });
}

async function updateSummary(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  logger.info({ message: 'updateSummary.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      summary: item.toString,
    },
  });
  logger.info({ message: 'updateSummary.completed', data: { issueDocId } });
}

async function updateIssueStatus(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string,
  issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody,
  { requestId, resourceId }: Other.Type.RequestCtx
) {
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
      logger.info({ message: 'updateIssueStatus.issueStatus.READY_FOR_QA', data: { issueDocId } });
      await createReOpenRate(issueData, { requestId, resourceId });
    } else if (issueStatus[ChangelogStatus.QA_FAILED] === item.to) {
      logger.info({ message: 'updateIssueStatus.issueStatus.QA_FAILED', data: { issueDocId } });
      const reOpenRateData = await getReopenRateDataById(issueData.id, issueData.organizationId, {
        requestId,
        resourceId,
      });
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
}

async function updateAssignee(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  logger.info({ message: 'updateAssignee.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      assigneeId: `${mappingPrefixes.user}_${item.to}`,
    },
  });
  logger.info({ message: 'updateAssignee.completed', data: { issueDocId } });
}

async function updatePriority(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  logger.info({ message: 'updatePriority.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      priority: item.toString,
    },
  });
  logger.info({ message: 'updatePriority.completed', data: { issueDocId } });
}

async function updateDevRca(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  logger.info({ message: 'updateDevRca.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      rcaData: { devRca: `${mappingPrefixes.rca}_${item.to}` },
    },
  });
  logger.info({ message: 'updateDevRca.completed', data: { issueDocId } });
}

async function updateQARca(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  logger.info({ message: 'updateQARca.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      rcaData: { qaRca: `${mappingPrefixes.rca}_${item.to}` },
    },
  });
  logger.info({ message: 'updateQARca.completed', data: { issueDocId } });
}

async function updateIssueType(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
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
) {
  logger.info({ message: 'updateIssueParentAssociation.initiated', data: { issueData } });
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
  logger.info({ message: 'updateIssueParentAssociation.completed', data: { issueData } });
}

async function updateTimeTracker(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
) {
  logger.info({ message: 'updateTimeTracker.initiated', data: { issueDocId } });
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      timeTracker: { estimate: item.to },
    },
  });
  logger.info({ message: 'updateTimeTracker.completed', data: { issueDocId } });
}
function changelogsToProcess(changelogs: Jira.ExternalType.Webhook.ChangelogItem[]) {
  const [item] = changelogs.filter(
    (item) =>
      validChangelogFields.includes(item.field) || validChangelogFields.includes(item.fieldId)
  );
  logger.info({ message: 'changelogsToProcess', data: { changelogs, item } });
  return item;
}
async function handleIssueUpdate(
  changelog: { items: Jira.ExternalType.Webhook.ChangelogItem[] },
  issueData: Jira.ExternalType.Webhook.Issue,
  organization: string,
  reqCtx: { requestId: string; resourceId: string },
  processId: string
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
      //changelog contains parentId and issueData contains subtask.
      //update parent task with subtask id
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
          //also incorporate cycle time and on ready for qa create index in reopenrate
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
) {
  logger.info({ message: 'deleteIssueCycleTimeAndReOpenRate.initiated', data: issueData });
  const issueDoc = await fetchIssue(issueData.id, organization, reqCtx);
  const issueDocId = issueDoc._id;
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      isDeleted: true,
      deletedAt: moment().toISOString(),
    },
  });
  //soft delete cycle time document
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

async function createReOpenRate(
  issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody,
  reqCtx: Other.Type.RequestCtx
) {
  logger.info({ message: 'createReOpenRate.initiated', data: issueData });
  const reopenRateData = await formatReopenRateData(issueData);
  logger.info({ message: 'createReOpenRate.formatted.data', data: JSON.stringify(reopenRateData) });
  await saveReOpenRate(reopenRateData, reqCtx);
  logger.info({ message: 'createReOpenRate.completed', data: issueData });
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
        logger.info({ message: 'ISSUE_CREATE_EVENT', data: messageBody.issueData.key });
        await saveIssueDetails(messageBody.issueData, reqCtx, processId);
        break;
      case Jira.Enums.Event.IssueUpdated:
        logger.info({ message: 'ISSUE_UPDATED_EVENT', data: messageBody.issueInfo.key });
        await handleIssueUpdate(
          messageBody.changelog,
          messageBody.issueInfo,
          messageBody.organization,
          reqCtx,
          processId
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
