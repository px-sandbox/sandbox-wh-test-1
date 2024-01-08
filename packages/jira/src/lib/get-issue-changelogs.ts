import { Jira } from 'abstraction';
import { ChangelogField } from 'abstraction/jira/enums';
import { JiraClient } from './jira-client';

export async function getIssueChangelogs(
    organization: string,
    issueId: string,
    jira: JiraClient
): Promise<Array<Jira.ExternalType.Webhook.ChangelogItem>> {
    const changelogs = await jira.getIssueChangelogs(issueId);

    const changelogValues: Jira.ExternalType.Webhook.ChangelogItem[] = changelogs.flatMap((changelog) => {
        const items = changelog.items.filter(
            (item) =>
                (item.fieldtype === ChangelogField.JIRA && item.field === ChangelogField.STATUS) ||
                (item.fieldtype === ChangelogField.CUSTOM && item.field === ChangelogField.SPRINT
                ));
        return items;
    });
    return changelogValues;
}
