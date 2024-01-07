import { Jira } from 'abstraction';
import { ChangelogTypes } from 'abstraction/jira/enums';
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
    messageBody: (Pick<Hit, '_id'> & HitBody) | Jira.ExternalType.Webhook.ReopenRateIssue,
    reOpenCount = 0
): Promise<(Pick<Hit, '_id'> & HitBody) | Jira.ExternalType.Webhook.ReopenRateIssue> {
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
            const changelogSprint = changelogItems.findLast((item) => item.field === 'Sprint');
            if (changelogSprint) {
                issueWebhookData.sprintId = getSprintForTo(changelogSprint.to, changelogSprint.from);
            }
            if (reOpenCount) {
                issueWebhookData.reOpenCount = reOpenCount;
            }
            issueWebhookData.reOpenCount += reOpenCount;
            issueWebhookData.isReopen = !!reOpenCount;
        }
        return { ...issueWebhookData };
    } catch (error) {
        logger.error(`prepareReopenRate.error, ${error} `);
        throw error;
    }
}
export async function prepareReopenRate(
    messageBody: Jira.ExternalType.Webhook.ReopenRateIssue,
    typeOfChangelog: ChangelogTypes
): Promise<Jira.ExternalType.Webhook.ReopenRateIssue | false> {
    const reOpenRateData = await getReopenRateDataById(
        messageBody.issue.id,
        messageBody.sprintId,
        messageBody.organization
    );

    let returnObj = {};
    switch (typeOfChangelog) {
        case ChangelogTypes.READY_FOR_QA:
            if (reOpenRateData) {
                logger.info(
                    `issue_already_exists_in_reopen_rate_index',issueId: ${messageBody.issue.id},
                    typeOfChangelog: ${typeOfChangelog}  `
                );
                return false;
            }
            returnObj = await prepareData(messageBody, 0);
            break;
        case ChangelogTypes.QA_FAILED:
            if (!reOpenRateData) {
                logger.info(
                    `issue_not_exists_in_reopen_rate_index', issueId: ${messageBody.issue.id},
                    typeOfChangelog: ${typeOfChangelog} `
                );
                return false;
            }
            returnObj = await prepareData(messageBody, 1);
            break;
        case ChangelogTypes.SPRINT:
            if (!reOpenRateData) {
                logger.info(
                    `issue_not_exists_in_reopen_rate_index', issueId: ${messageBody.issue.id},
                    typeOfChangelog: ${typeOfChangelog} `
                );
                return false;
            }
            returnObj = await prepareData(messageBody, reOpenRateData.reOpenCount);
            break;
        default:
            return messageBody;
    }
    return returnObj as Jira.ExternalType.Webhook.ReopenRateIssue;
}
