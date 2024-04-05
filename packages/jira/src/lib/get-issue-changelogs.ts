import { Jira } from 'abstraction';
import { ChangelogField } from 'abstraction/jira/enums';
import { JiraClient } from './jira-client';

export async function getIssueChangelogs(
  changelogs: Jira.ExternalType.Api.Changelogs[]
): Promise<Array<Jira.ExternalType.Webhook.ChangelogItem>> {

  const changelogValues: Jira.ExternalType.Webhook.ChangelogItem[] = changelogs.flatMap(
    (changelog) => {
      const items = changelog.items.filter(
        (item) =>
          (item.fieldtype === ChangelogField.JIRA && item.field === ChangelogField.STATUS) ||
          (item.fieldtype === ChangelogField.CUSTOM && item.field === ChangelogField.SPRINT)
      );
      return items;
    }
  );
  return changelogValues;
}
