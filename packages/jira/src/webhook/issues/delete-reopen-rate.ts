import { Jira, Other } from 'abstraction';
import { Hit, HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import moment from 'moment';
import { saveReOpenRate } from '../../repository/issue/save-reopen-rate';
import { getReopenRateDataByIssueId } from '../../repository/issue/get-issue';
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
        const reopenRateData = await getReopenRateDataByIssueId(issue.issue.id, issue.organization);
        if (reopenRateData.length > 0) {
            reopenRateData.forEach(async (issueData: Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody) => {
                issueData.isDeleted = true;
                issueData.deletedAt = moment(eventTime).toISOString();
                const { _id, ...reopenData } = issueData;
                await saveReOpenRate({ id: _id, body: reopenData } as Jira.Type.Issue);
            });
        } else {
            logger.info(`Reopen Rate Data not found for issueId: ${issue.issue.id}`);
        }
    } catch (error) {
        logger.error(`removeReopenRate.error, ${error}`);
    }
}
