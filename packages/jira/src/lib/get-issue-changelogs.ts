import { Jira } from 'abstraction';
import { ChangelogField } from 'abstraction/jira/enums';
import { toLower } from 'lodash';
import { JiraClient } from './jira-client';

export async function filterIssueChangelogs(
  changelogs: Jira.ExternalType.Api.Changelogs[]
): Promise<Array<Jira.ExternalType.Webhook.ChangelogItem>> {
  const changelogValues: Jira.ExternalType.Webhook.ChangelogItem[] = changelogs.flatMap(
    (changelog) => {
      const items = changelog.items.filter(
        (item) =>
          (item.fieldtype === ChangelogField.JIRA &&
            toLower(item.field) === ChangelogField.STATUS) ||
          (item.fieldtype === ChangelogField.CUSTOM && item.field === ChangelogField.SPRINT)
      );
      return items;
    }
  );
  return changelogValues;
}

export async function getIssueChangelogs(
  issueId: string,
  jira: JiraClient
): Promise<Array<Jira.ExternalType.Webhook.ChangelogItem>> {
  const changelogs = await jira.getIssueChangelogs(issueId);
  return filterIssueChangelogs(changelogs);
}
