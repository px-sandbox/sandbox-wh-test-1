import { Jira } from "abstraction";
import { JiraClient } from "./jira-client";

export async function getIssueChangelogs(organization: string, issueId: string, jira: JiraClient):
    Promise<Array<Jira.ExternalType.Api.Changelogs>> {
    const changelogs = await jira.getIssueChangelogs(issueId);

    const changelogValues: Jira.ExternalType.Api.Changelogs[] = changelogs.flatMap((changelog) => {
        const items = changelog.items.filter((item) => (item.fieldtype === 'jira' && item.field === 'status') || (item.fieldtype === 'custom' && item.field === 'Sprint'));
        return { items };
    });
    return changelogValues;
}