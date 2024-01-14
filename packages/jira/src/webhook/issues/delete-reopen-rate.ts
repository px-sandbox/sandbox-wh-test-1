import { Jira } from 'abstraction';
import { Hit, HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import moment from 'moment';
import { saveReOpenRate } from '../../repository/issue/save-reopen-rate';
import { getReopenRateDataById } from '../../repository/issue/get-issue';


/**
 * Removes the reopen issue with the given ID and marks it as deleted.
 * @param issueId - The ID of the issue to be removed.
 * @param eventTime - The time when the issue was deleted.
 * @param organization - The organization the issue belongs to.
 * @returns A Promise that resolves with void if the issue was successfully removed,
 *  or false if the issue was not found.
 */
export async function removeReopenRate(
    issue: (Pick<Hit, '_id'> & HitBody) | Jira.Mapped.ReopenRateIssue,
    eventTime: moment.Moment,
): Promise<void | false> {
    try {
        const sprintId = issue.issue.fields?.customfield_10007;
        sprintId.forEach(async (sprint: { id: string }) => {
            const reopenRateData = await getReopenRateDataById(issue.issue.id, sprint.id, issue.organization);
            if (reopenRateData) {
                reopenRateData.isDeleted = true;
                reopenRateData.deletedAt = moment(eventTime).toISOString();
                const { _id, ...reopenData } = reopenRateData;
                await saveReOpenRate({ id: _id, body: reopenData } as Jira.Type.Issue);
            } else {
                logger.info(`Reopen Rate Data not found for issueId: ${issue.issue.id} and sprintId: ${sprint.id}`);
            }
        });
    } catch (error) {
        logger.error(`removeReopenRate.error, ${error}`);
    }
}
