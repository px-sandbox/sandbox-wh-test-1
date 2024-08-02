import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from 'src/constant/config';
import { ParamsMapping } from 'src/model/params-mapping';
import { Organization } from 'src/processors/organization';

const esClientObj = ElasticSearchClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();

export async function orgInstallation(
  data: Github.ExternalType.Webhook.Installation,
  requestId: string
): Promise<void> {
  logger.info({
    message: 'INSTALLATION_CREATED',
    data: '',
    requestId,
  });
  try {
    logger.info({
      message: 'getOrganizationDetails.invoked',
      requestId,
      data: JSON.stringify(data),
    });
    const orgId = `${mappingPrefixes.organization}_${data.installation.account.id}`;
    const records = await dynamodbClient.find(new ParamsMapping().prepareGetParams(orgId));
    const resourceId = orgId;
    const result = new Organization(data, requestId, resourceId).validate();
    if (result) {
      const formattedData = await result.processor(records?.parentId as string);
      if (records === undefined) {
        await dynamodbClient.put(
          new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
        );
      }
      await esClientObj.putDocument(Github.Enums.IndexName.GitOrganization, formattedData);

      //TODO: start migration process here
    }
  } catch (error: unknown) {
    logger.error({ message: 'getOrganizationDetails.error', error, requestId });
    throw error;
  }
}
