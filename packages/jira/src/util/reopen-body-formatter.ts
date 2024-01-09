/* eslint-disable max-lines-per-function */
import { Jira } from 'abstraction';
import { ChangelogItem } from 'abstraction/jira/external/webhook';
import { mappingPrefixes } from 'src/constant/config';
import { getIssueStatusForReopenRate } from 'src/util/issue-status';

interface ReopenItem {
    organizationId: string;
    issueKey: string;
    projectId: string;
    boardId: string;
    issueId: string;
    sprintId: string | null;
    isReopen: boolean;
    reOpenCount: number;
    isDeleted: boolean;
    deletedAt: Date | null;
}


function isMultipleSprints(sprintIds: string): boolean {
    return sprintIds.split(", ").length > 1;
}

function getSprintForTo(to: string, from: string): string {
    const toElements = to.split(", ");
    const fromElements = from.split(", ");
    const result = toElements.filter((item) => !fromElements.includes(item));
    return result[0];
}


/*
* @param {Array} input - Changelogs
* @param {String} issueId - Issue Id
* @param {String} sprintId - Sprint Id | null
* @param {String} organizationId - Organization Id
* @param {String} boardId - Board Id
* @param {String} issueKey - Issue Key
* @param {String} projectId - Project Id
* @returns {Array} - Reopen Rate Data
*/
export async function reopenChangelogCals(
    input: ChangelogItem[],
    issueId: string,
    sprintId: string,
    organizationId: string,
    boardId: string,
    issueKey: string,
    projectId: string,
): Promise<ReopenItem[]> {
    const reopen: ReopenItem[] = [];
    let reopenObj: any = null;
    let currentSprint: string | null = sprintId || null;
    const issueStatus = await getIssueStatusForReopenRate(organizationId);

    // eslint-disable-next-line complexity
    input.forEach((item, index) => {

        switch (item.field) {
            case Jira.Enums.ChangelogField.STATUS:
                if (reopen.length > 0 && reopen[reopen.length - 1]?.sprintId == currentSprint) {
                    reopenObj = reopen.pop();
                }

                if (item.to === issueStatus.Ready_For_QA || item.to === issueStatus.Deployed_To_QA) {
                    reopenObj = reopenObj || {
                        organizationId,
                        issueKey,
                        projectId,
                        boardId,
                        issueId,
                        sprintId,
                        isReopen: false,
                        reOpenCount: 0,
                        isDeleted: false,
                        deletedAt: null,
                    }
                } else if (item.to === issueStatus.QA_Failed) {
                    reopenObj.isReopen = true;
                    reopenObj.reOpenCount += 1;
                    reopen.push(reopenObj);

                    reopenObj = null;

                } else if ([issueStatus.QA_Passed,
                issueStatus.Ready_For_UAT,
                issueStatus.Ready_For_Prod,
                issueStatus.Done].
                    includes(item.to)) {
                    reopen.push(reopenObj);

                    reopenObj = null;
                }
                break;
            case Jira.Enums.ChangelogField.SPRINT:
                if (reopenObj) {
                    if (isMultipleSprints(item.from)) {
                        input.slice(0, index - 1).findLast((element) =>
                            element.field === Jira.Enums.ChangelogField.SPRINT);
                        reopenObj.sprintId = getSprintForTo(item.to, item.from);
                    } else {
                        reopenObj.sprintId = item.from;

                    }
                    reopen.push(reopenObj);
                    reopenObj = null;
                }

                currentSprint = isMultipleSprints(item.to) ? getSprintForTo(item.to, item.from) : item.to;
                break;
            default:
                break;
        }
    });

    if (reopen[0] && reopen[0].sprintId === null) {
        reopen[0].sprintId = sprintId;
        reopenObj.id = `${mappingPrefixes.reopen_rate}_${issueId}_${mappingPrefixes.sprint}_${sprintId}`;
    }


    return reopen.map(({ sprintId: sprint, ...item }) => ({
        id: `${mappingPrefixes.reopen_rate}_${issueId}_${mappingPrefixes.sprint}_${sprint}`,
        sprintId: `${mappingPrefixes.sprint}_${sprint}`,
        ...item,
    }));
}
