/* eslint-disable max-lines-per-function */
import { Jira } from 'abstraction';
import { ChangelogItem } from 'abstraction/jira/external/webhook';
import { logger } from 'core';
import { ChangelogStatus } from 'abstraction/jira/enums';
import { HitBody } from 'abstraction/other/type';
import { mappingPrefixes } from '../constant/config';


interface ReopenItem {
    organizationId: string;
    issueKey: string;
    projectId: string;
    projectKey: string;
    boardId: string;
    issueId: string;
    sprintId: string | null;
    isReopen: boolean;
    reOpenCount: number;
    isDeleted: boolean;
    deletedAt: Date | null;
}

interface changeLogItem {
    field: string,
    fieldtype: string,
    fieldId: string,
    from: string,
    fromString: string,
    to: string,
    toString: string
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

async function isValid(input: ChangelogItem[], issueStatus: HitBody): Promise<boolean> {
    let flag = true;
    let isReadyForQA = false;
    let isSprintChanged = false;

    for (const item of input) {
        switch (item.field) {
            case Jira.Enums.ChangelogField.STATUS:
                if (issueStatus[ChangelogStatus.READY_FOR_QA].includes(item.to)) {
                    isReadyForQA = true;
                    isSprintChanged = false;
                } else if (
                    [
                        issueStatus[ChangelogStatus.QA_PASSED],
                        issueStatus[ChangelogStatus.READY_FOR_UAT],
                        issueStatus[ChangelogStatus.READY_FOR_PROD],
                        issueStatus[ChangelogStatus.DONE],
                        issueStatus[ChangelogStatus.QA_PASS_DEPLOY],
                        issueStatus[ChangelogStatus.QA_FAILED],

                        issueStatus[ChangelogStatus.TO_DO],
                        issueStatus[ChangelogStatus.IN_PROGRESS],
                        issueStatus[ChangelogStatus.DEV_COMPLETE],
                        issueStatus[ChangelogStatus.CODE_REVIEW]

                    ].includes(item.to)
                ) {
                    isReadyForQA = false;
                    isSprintChanged = false;
                }
                break;

            case Jira.Enums.ChangelogField.SPRINT:
                isSprintChanged = true;
                break;

            default:
                break;
        }
        if (isReadyForQA && isSprintChanged) {
            flag = false;
            break;
        }
    }
    return flag;
}

/*
 * @param {Array} input - Changelogs
 * @param {String} issueId - Issue Id
 * @param {String} sprint - Sprint Id | null
 * @param {String} organizationId - Organization Id
 * @param {String} boardId - Board Id
 * @param {String} issueKey - Issue Key
 * @param {String} projectId - Project Id
 * @param {String} projectKey - Project Key
 * @param {Object} issueStatus - Issue Status
 */
export async function reopenChangelogCals(
    input: ChangelogItem[],
    issueId: string,
    sprintId: string,
    organizationId: string,
    boardId: string,
    issueKey: string,
    projectId: string,
    projectKey: string,
    issueStatus: HitBody
): Promise<ReopenItem[]> {
    try {
        const reopen: ReopenItem[] = [];
        let reopenObject: ReopenItem | null | undefined = null;
        let currentSprint: string | null = sprintId || null;

        if (!isValid(input, issueStatus)) {
            logger.info(`reopen-rate.changelog.invalid with issueKey: ${issueKey}. Reopen rate calculation skipped.`);
            return [];
        }

        // eslint-disable-next-line complexity
        input.forEach((item, index) => {
            try {
                if (
                    reopen.length > 0 &&
                    reopen[reopen.length - 1].sprintId === currentSprint
                ) {
                    reopenObject = reopen.pop();
                }

                switch (item.field) {
                    case Jira.Enums.ChangelogField.STATUS:
                        if (issueStatus[ChangelogStatus.READY_FOR_QA].includes(item.to)) {
                            reopenObject = reopenObject || {
                                organizationId,
                                issueKey,
                                projectId,
                                projectKey,
                                boardId,
                                issueId,
                                sprintId,
                                isReopen: false,
                                reOpenCount: 0,
                                isDeleted: false,
                                deletedAt: null,
                            };

                            reopen.push(reopenObject);
                            reopenObject = null;
                        } else if (
                            reopenObject &&
                            item.to === issueStatus[ChangelogStatus.QA_FAILED]
                        ) {
                            reopenObject.isReopen = true;
                            reopenObject.reOpenCount += 1;

                            reopen.push(reopenObject);
                            reopenObject = null;
                        } else if (
                            reopenObject &&
                            [
                                issueStatus[ChangelogStatus.QA_PASSED],
                                issueStatus[ChangelogStatus.READY_FOR_UAT],
                                issueStatus[ChangelogStatus.READY_FOR_PROD],
                                issueStatus[ChangelogStatus.DONE],
                                issueStatus[ChangelogStatus.QA_PASS_DEPLOY],
                            ].includes(item.to)
                        ) {
                            reopen.push(reopenObject);
                            reopenObject = null;
                        }
                        break;

                    case Jira.Enums.ChangelogField.SPRINT:
                        if (reopenObject) {
                            if (isMultipleSprints(item.from)) {
                                const sprintItem = input
                                    .slice(0, index - 1)
                                    .findLast(
                                        (lastItem) =>
                                            lastItem.field ===
                                            Jira.Enums.ChangelogField.SPRINT
                                    ) as changeLogItem;

                                reopenObject.sprintId = getSprintForTo(
                                    sprintItem.to,
                                    sprintItem.from
                                );
                            } else {
                                reopenObject.sprintId = item.from;
                            }

                            reopen.push(reopenObject);
                            reopenObject = null;
                        }

                        currentSprint = isMultipleSprints(item.to)
                            ? getSprintForTo(item.to, item.from)
                            : item.to;
                        break;

                    default:
                        break;
                }
            } catch (error) {
                logger.error(`reopen-rate.processor.error', ${error}`);
                throw error;

            }
        });

        if (reopen[0] && reopen[0].sprintId === null) {
            reopen[0].sprintId = sprintId;
        }
        return reopen
            .filter((item) => item !== null)
            .map(({ sprintId: sprint, issueId: bugId, ...item }) => ({
                ...item,
                id: `${mappingPrefixes.reopen_rate}_${bugId}_${mappingPrefixes.sprint}_${sprint}`,
                sprintId: `${mappingPrefixes.sprint}_${sprint}`,
                issueId: `${mappingPrefixes.issue}_${bugId}`,
            }));
    } catch (error) {
        logger.error(`error.reopen.calculator, ${error}`);
        throw error;
    }
}