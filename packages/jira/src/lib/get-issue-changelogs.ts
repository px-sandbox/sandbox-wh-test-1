import { Jira } from "abstraction";
import { JiraClient } from "./jira-client";

export async function getIssueChangelogs(organization: string, issueId: string):
    Promise<Array<Jira.ExternalType.Api.Changelogs>> {
    const jira = await JiraClient.getClient(organization);
    const changelogs = await jira.getIssueChangelogs(issueId);

    const changelogValues: Jira.ExternalType.Api.Changelogs[] = changelogs.map((changelog) => {
        const items = changelog.items.filter((item) => item.fieldtype === 'jira' && item.field === 'status');
        return {
            ...changelog,
            items,
        };
    });
    return changelogValues;
}