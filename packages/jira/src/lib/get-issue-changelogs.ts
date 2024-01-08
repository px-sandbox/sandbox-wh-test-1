import { Jira } from 'abstraction';
import { JiraClient } from './jira-client';
import { ChangelogField, ChangelogStatus } from 'abstraction/jira/enums';

export async function getIssueChangelogs(
    organization: string,
    issueId: string,
    jira: JiraClient
): Promise<Array<Jira.ExternalType.Api.Changelogs>> {
    const changelogs = await jira.getIssueChangelogs(issueId);

    const changelogValues: Jira.ExternalType.Api.Changelogs[] = changelogs.flatMap((changelog) => {
        const items = changelog.items.filter(
            (item) =>
                (item.fieldtype === ChangelogField.JIRA && item.field === ChangelogField.STATUS) ||
                (item.fieldtype === ChangelogField.CUSTOM && item.field === ChangelogField.SPRINT
                ));
        return { items };
    });
    return changelogValues;
}
