import { Github } from 'abstraction';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { DataProcessor } from './data-processor';
import { DynamoDbDocClientGh } from '@pulse/dynamodb';
import { SQSClientGh } from '@pulse/event-handler';

const dynamodbClient = DynamoDbDocClientGh.getInstance();
const sqsClient = SQSClientGh.getInstance();
export class ActiveBranchProcessor extends DataProcessor<
  Github.Type.RawActiveBRanches,
  Github.Type.ActiveBranches
> {
  constructor(data: Github.Type.RawActiveBRanches) {
    super(data, sqsClient, dynamodbClient);
  }

  public async processor(): Promise<Github.Type.ActiveBranches> {
    const bodyId = `${mappingPrefixes.branch_count}_${this.ghApiData.repoId}_${this.ghApiData.createdAt}`;

    let parentId: string = await this.getParentId(bodyId);
    if (!parentId) {
      parentId = uuid();
      await this.putDataToDynamoDB(bodyId, bodyId);
    }
    return {
      id: parentId,
      body: {
        id: bodyId,
        repoId: this.ghApiData.repoId,
        organizationId: this.ghApiData.organizationId,
        createdAt: this.ghApiData.createdAt,
        branchesCount: this.ghApiData.branchesCount,
      },
    };
  }
}
