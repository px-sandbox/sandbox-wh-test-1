import moment from 'moment';
import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';
import { DynamoDbDocClientGh } from '@pulse/dynamodb';
import { SQSClientGh } from '@pulse/event-handler';

const dynamodbClient = DynamoDbDocClientGh.getInstance();
const sqsClient = SQSClientGh.getInstance();
export class GHCopilotProcessor extends DataProcessor<
  Github.ExternalType.Api.GHCopilotReport,
  Github.Type.GHCopilotReport
> {
  constructor(data: Github.ExternalType.Api.GHCopilotReport) {
    super(data, sqsClient, dynamodbClient);
  }
  public async processor(): Promise<Github.Type.GHCopilotReport> {
    const lastActivityAt = this.ghApiData.last_activity_at;
    const lastActivityEditor = this.ghApiData.last_activity_editor?.split('/') || [];
    const ghCopilotObj = {
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

    return ghCopilotObj;
  }
}
