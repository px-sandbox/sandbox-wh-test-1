import { RequestInterface } from '@octokit/types';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { ParamsMapping } from '../model/params-mapping';
import { Organization } from '../processors/organization';

const esClientObj = ElasticSearchClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();
export async function fetchAndSaveOrganizationDetails(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  organizationName: string,
  requestId: string
): Promise<{ name: string }> {
  try {
    logger.info({ message: 'getOrganizationDetails.invoked', requestId, data: organizationName });
    const responseData = await octokit(`GET /orgs/${organizationName}`);
    const orgId = `${mappingPrefixes.organization}_${responseData.data.id}`;
    const records = await dynamodbClient.find(new ParamsMapping().prepareGetParams(orgId));
    const resourceId = orgId;
    if (responseData?.data) {
      const result = new Organization(responseData.data, requestId, resourceId).validate();
      if (result) {
        const formattedData = await result.processor(records?.parentId as string);
        if (records === undefined) {
          await dynamodbClient.put(
            new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
          );
        }
        await esClientObj.putDocument(Github.Enums.IndexName.GitOrganization, formattedData);
      }
    }
    logger.info({
      message: 'getOrganizationDetails.successful',
      data: {
        response: responseData?.data,
      },
      requestId,
    });
    return responseData?.data?.login;
  } catch (error: unknown) {
    logger.error({ message: 'getOrganizationDetails.error', error, requestId });
    throw error;
  }
}
