import { Github } from 'abstraction';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';

export class GHCopilotProcessor extends DataProcessor<
  Github.ExternalType.Api.GHCopilotReport,
  Github.Type.GHCopilotReport
> {
  constructor(
    data: Github.ExternalType.Api.GHCopilotReport,
    requestId: string,
    resourceId: string
  ) {
    super(data, requestId, resourceId, Github.Enums.Event.Copilot);
    this.validate();
  }

  public async process(): Promise<void> {
    // active branches is a cron to update the branch count, no cases for switch statement
    await this.format();
  }

  public async format(): Promise<void> {
    const lastActivityAt = this.ghApiData.last_activity_at;
    const lastActivityEditor = this.ghApiData.last_activity_editor?.split('/') || [];
    this.formattedData = {
      id: uuid(),
      body: {
        dataTimestamp: new Date().toISOString(),
        lastUsedAt: lastActivityAt ?? null,
        isUsedInLastHour: lastActivityAt
          ? moment.utc(lastActivityAt).isAfter(moment.utc().subtract(1, 'hour'))
          : false,
        editor: lastActivityEditor?.[0] ?? null,
        editorVersion: lastActivityEditor?.[1] ?? null,
        featureUsed: lastActivityEditor?.[2] ?? null,
        featureVersion: lastActivityEditor?.[3] ?? null,
        userId: `${mappingPrefixes.user}_${this.ghApiData.assignee.id}`,
      },
    };
  }
}
