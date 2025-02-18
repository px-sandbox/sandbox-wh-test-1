import { Jira, Other } from 'abstraction';
import { ChangelogField, ChangelogStatus } from 'abstraction/jira/enums';
import { Hit, HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import { getReopenRateDataById } from '../repository/issue/get-issue';

export function getSprintForTo(to: string, from: string): string | null {
  const toElements = to.split(', ').filter(Boolean);
  const fromElements = from.split(', ').filter(Boolean);
  let result = [];
  if (toElements.length === 0) {
    result[0] = null;
  } else if (toElements.length === 1) {
    result[0] = toElements[0];
  } else {
    result = toElements.filter((item) => !fromElements.includes(item));
  }
  if (result.length > 1) {
    return null;
  }
  return result[0];
}
async function prepareData(
  messageBody: (Pick<Hit, '_id'> & HitBody) | Jira.Mapped.ReopenRateIssue,
  reOpenCount = 0
): Promise<(Pick<Hit, '_id'> & HitBody) | Jira.Mapped.ReopenRateIssue> {
  try {
    const issueWebhookData = messageBody;
    issueWebhookData.reOpenCount = reOpenCount;
    issueWebhookData.isReopen = !!reOpenCount;
    return { ...issueWebhookData };
  } catch (error) {
    logger.error({ message: `prepareReopenRate.error, ${error} ` });
    throw error;
  }
}
export async function prepareReopenRate(
  messageBody: Jira.Mapped.ReopenRateIssue,
  typeOfChangelog: ChangelogStatus | ChangelogField,
  reqCtx: Other.Type.RequestCtx
): Promise<Jira.Mapped.ReopenRateIssue | false> {
  const updatedMessageBody = messageBody;
  const reOpenRateData = await getReopenRateDataById(
    updatedMessageBody.issueId,
    updatedMessageBody.sprintId,
    updatedMessageBody.organizationId,
    reqCtx
  );
  let returnObj = {};
  switch (typeOfChangelog) {
    case ChangelogStatus.READY_FOR_QA:
      if (reOpenRateData) {
        logger.info({
          ...reqCtx,
          message: `issue_already_exists_in_reopen_rate_index',issueId: ${updatedMessageBody.issueId},
                    typeOfChangelog: ${typeOfChangelog}  `,
        });
        return false;
      }
      returnObj = await prepareData(updatedMessageBody);
      break;
    case ChangelogStatus.QA_FAILED:
      if (!reOpenRateData) {
        logger.info({
          ...reqCtx,
          message: `issue_not_exists_in_reopen_rate_index', issueId: ${updatedMessageBody.issueId},
                    typeOfChangelog: ${typeOfChangelog} `,
        });
        return false;
      }
      returnObj = await prepareData(updatedMessageBody, reOpenRateData.reOpenCount + 1);

      break;
    default:
      return false;
  }
  return returnObj as Jira.Mapped.ReopenRateIssue;
}
