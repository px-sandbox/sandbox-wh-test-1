import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { ChangelogStatus } from 'abstraction/jira/enums';
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
  const issueData = await fetchIssue(worklogData.issueId, worklogData.organization, reqCtx);
  const issueDocId = issueData._id;
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      timeTracker: {
        actual: worklogData.worklog.timeSpentSeconds,
      },
    },
  });
  logger.info({ message: 'actual_time_updated', data: { issueDocId } });
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
      label: labels,
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

  if (issueData.issueType === Jira.Enums.IssuesTypes.BUG) {
    // update reopen rate or create reopen rate
    const orgId = issueData.organizationId.split('jira_org_')[1];
    const issueStatus = await getIssueStatusForReopenRate(
      `${mappingPrefixes.organization}_${orgId}`,
      {
        requestId,
        resourceId,
      }
    );
    if (issueStatus[ChangelogStatus.READY_FOR_QA] === item.to) {
      await createReOpenRate(issueData, { requestId, resourceId });
    } else if (issueStatus[ChangelogStatus.QA_FAILED] === item.to) {
      logger.info({
        requestId,
        resourceId,
        data: { typeOfChangelog: ChangelogStatus.QA_FAILED },
        message: 'issue_info_ready_for_QA_update_event: Send message to SQS',
      });
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

async function updateDevRca(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      rcaData: { devRca: `${mappingPrefixes.rca}_${item.to}` },
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

async function updateIssueType(item: Jira.ExternalType.Webhook.ChangelogItem, issueDocId: string) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      issueType: item.toString,
    },
  });
}

async function updateIssueParentAssociation(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueData: Jira.ExternalType.Webhook.Issue,
  organization: string,
  reqCtx: { requestId: string; resourceId: string }
) {
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

async function updateTimeTracker(
  item: Jira.ExternalType.Webhook.ChangelogItem,
  issueDocId: string
) {
  await esClientObj.updateDocument(Jira.Enums.IndexName.Issue, issueDocId, {
    body: {
      timeTracker: { estimate: item.to },
    },
  });
}

async function handleIssueUpdate(
  changelog: { items: Jira.ExternalType.Webhook.ChangelogItem[] },
  issueData: Jira.ExternalType.Webhook.Issue,
  organization: string,
  reqCtx: { requestId: string; resourceId: string },
  processId: string
): Promise<void> {
  changelog.items.forEach(async (item) => {
    try {
      const field = item.fieldId || item.field;
      if (field === Jira.Enums.ChangelogName.ISSUE_PARENT_ASSOCIATION) {
        //changelog contains parentId and issueData contains subtask.
        //update parent task with subtask id
        await updateIssueParentAssociation(item, issueData, organization, reqCtx);
      } else {
        const issueDoc = await fetchIssue(issueData.id, organization, reqCtx);
        const issueDocId = issueDoc._id;
        switch (field) {
          case Jira.Enums.ChangelogName.SPRINT:
            await updateSprintAndBoard(item, issueDoc, issueDocId);
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
  });
}

async function deleteIssueCycleTimeAndReOpenRate(
  issueData: Jira.ExternalType.Webhook.Issue,
  organization: string,
  reqCtx: Other.Type.RequestCtx
) {
  logger.info({ message: 'deleteIssue.event', data: issueData, ...reqCtx });
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
    await removeReopenRate(issueData.id, moment().toISOString(), reqCtx);
  }
}

async function createReOpenRate(
  issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody,
  reqCtx: Other.Type.RequestCtx
) {
  const reopenRateData = await formatReopenRateData(issueData);
  logger.info({ message: 'createReOpenRate.formatted.data', data: JSON.stringify(reopenRateData) });
  await saveReOpenRate(reopenRateData, reqCtx);
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
        await handleIssueUpdate(
          messageBody.changelog,
          messageBody.issueInfo,
          messageBody.organization,
          reqCtx,
          processId
        );
        break;
      case Jira.Enums.Event.IssueDeleted:
        await deleteIssueCycleTimeAndReOpenRate(
          messageBody.issueInfo,
          messageBody.organization,
          reqCtx
        );
        break;
      case Jira.Enums.Event.WorklogCreated:
      case Jira.Enums.Event.WorklogUpdated:
      case Jira.Enums.Event.WorklogDeleted:
        await updateActualTime(messageBody, reqCtx);
        break;
      default:
        logger.error({
          requestId: reqCtx.requestId,
          resourceId: reqCtx.resourceId,
          message: 'ISSUE_SQS_RECEIVER_HANDLER',
          error: 'Unknown_event_type',
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
