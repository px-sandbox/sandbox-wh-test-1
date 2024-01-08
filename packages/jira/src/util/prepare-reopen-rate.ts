import { Jira } from 'abstraction';
import { ChangelogField, ChangelogStatus } from 'abstraction/jira/enums';
import { Hit, HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import { getIssueChangelogs } from '../lib/get-issue-changelogs';
import { JiraClient } from '../lib/jira-client';
import { getReopenRateDataById } from '../repository/issue/get-issue';

function getSprintForTo(to: string, from: string): string {
    const toElements = to.split(', ');
    const fromElements = from.split(', ');

    const result = toElements.filter((item) => !fromElements.includes(item));

    return result[0];
}
async function prepareData(
    messageBody: (Pick<Hit, '_id'> & HitBody) | Jira.Mapped.ReopenRateIssue,
    reOpenCount = 0
): Promise<(Pick<Hit, '_id'> & HitBody) | Jira.Mapped.ReopenRateIssue> {
    try {
        const issueWebhookData = messageBody;
        const jiraClient = await JiraClient.getClient(issueWebhookData.organization);
        const changelogArr = await getIssueChangelogs(
            issueWebhookData.organization,
            issueWebhookData.issue.id,
            jiraClient
        );
        if (changelogArr) {
            logger.info('changelogArr', { changelogLength: changelogArr.length });
            const changelogItems = changelogArr.flatMap((changelog) => changelog.items);
            const changelogSprint = changelogItems.findLast((item) => item.field === ChangelogField.SPRINT);
            if (changelogSprint) {
                issueWebhookData.sprintId = getSprintForTo(changelogSprint.to, changelogSprint.from);
            }
            issueWebhookData.reOpenCount = reOpenCount;
            issueWebhookData.isReopen = !!reOpenCount;
        }
        return { ...issueWebhookData };
    } catch (error) {
        logger.error(`prepareReopenRate.error, ${error} `);
        throw error;
    }
}
export async function prepareReopenRate(
    messageBody: Jira.Mapped.ReopenRateIssue,
    typeOfChangelog: ChangelogStatus | ChangelogField
): Promise<Jira.Mapped.ReopenRateIssue | false> {
    const reOpenRateData = await getReopenRateDataById(
        messageBody.issue.id,
        messageBody.sprintId,
        messageBody.organization
    );

    let returnObj = {};
    switch (typeOfChangelog) {
        case ChangelogStatus.READY_FOR_QA:
            if (reOpenRateData) {
                logger.info(
                    `issue_already_exists_in_reopen_rate_index',issueId: ${messageBody.issue.id},
                    typeOfChangelog: ${typeOfChangelog}  `
                );
                return false;
            }
            returnObj = await prepareData(messageBody);
            break;
        case ChangelogStatus.QA_FAILED:
            if (!reOpenRateData) {
                logger.info(
                    `issue_not_exists_in_reopen_rate_index', issueId: ${messageBody.issue.id},
                    typeOfChangelog: ${typeOfChangelog} `
                );
                return false;
            }
            returnObj = await prepareData(messageBody, reOpenRateData.reOpenCount + 1);
            break;
        default:
            return false;
    }
    return returnObj as Jira.Mapped.ReopenRateIssue;
}
