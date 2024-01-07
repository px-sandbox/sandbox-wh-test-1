import { Jira } from 'abstraction';
import { ChangelogTypes } from 'abstraction/jira/enums';
import { Hit, HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import { getIssueChangelogs } from 'src/lib/get-issue-changelogs';
import { JiraClient } from 'src/lib/jira-client';
import { getReopenRateDataById } from 'src/repository/issue/get-issue';

function getSprintForTo(to: string, from: string) {
    const toElements = to.split(', ');
    const fromElements = from.split(', ');

    const result = toElements.filter((item) => !fromElements.includes(item));

    return result[0];
}
async function prepareData(
    messageBody: (Pick<Hit, '_id'> & HitBody) | Jira.ExternalType.Webhook.ReopenRateIssue,
    reOpenCount = 0
) {
    try {
        const jiraClient = await JiraClient.getClient(messageBody.organization);
        const changelogArr = await getIssueChangelogs(
            messageBody.organization,
            messageBody.issue.id,
            jiraClient
        );
        if (changelogArr) {
            logger.info('changelogArr', { changelogLength: changelogArr.length });
            const changelogItems = changelogArr.flatMap((changelog) => changelog.items);
            const changelogSprint = changelogItems.findLast((item) => item.field === 'Sprint');
            if (changelogSprint) {
                messageBody.sprintId = getSprintForTo(changelogSprint.to, changelogSprint.from);
            }
            if (reOpenCount) {
                messageBody.reOpenCount = reOpenCount;
            }
            messageBody.reOpenCount = messageBody.reOpenCount + reOpenCount;
            messageBody.isReopen = reOpenCount ? true : false;
        }
        return { ...messageBody };
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
                    `issue_already_exists_in_reopen_rate_index', issueId: ${messageBody.issue.id},typeOfChangelog: ${typeOfChangelog}  `
                );
                return false;
            }
            returnObj = await prepareData(messageBody, 0);
            break;
        case ChangelogTypes.QA_FAILED:
            if (!reOpenRateData) {
                logger.info(
                    `issue_not_exists_in_reopen_rate_index', issueId: ${messageBody.issue.id},typeOfChangelog: ${typeOfChangelog} `
                );
                return false;
            }
            returnObj = await prepareData(messageBody, 1);
            break;
        case ChangelogTypes.SPRINT:
            if (!reOpenRateData) {
                logger.info(
                    `issue_not_exists_in_reopen_rate_index', issueId: ${messageBody.issue.id},typeOfChangelog: ${typeOfChangelog} `
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
