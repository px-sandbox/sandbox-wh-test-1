import { RequestInterface } from '@octokit/types';
import { DynamoDbDocClient, DynamoDbDocClientGh } from '@pulse/dynamodb';
import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../constant/config';
import { ParamsMapping } from '../model/params-mapping';
import { Organization } from '../processors/organization';

const esClientObj = ElasticSearchClientGh.getInstance();
const dynamodbClient = DynamoDbDocClientGh.getInstance();
export async function fetchAndSaveOrganizationDetails(
  octokit: RequestInterface<
    object & {
      headers: {
        authorization: string | undefined;
      };
    }
  >,
  organizationName: string
): Promise<{ name: string }> {
  try {
    logger.info('getOrganizationDetails.invoked');
    const responseData = await octokit(`GET /orgs/${organizationName}`);
    const orgId = `${mappingPrefixes.organization}_${responseData.data.id}`;
    const records = await dynamodbClient.find(new ParamsMapping().prepareGetParams(orgId));
    if (responseData?.data) {
      const result = new Organization(responseData.data).validate();
      if (result) {
        const formattedData = await result.processor(records?.parentId as string);
        if (records === undefined) {
          logger.info('---NEW_RECORD_FOUND---');
          await dynamodbClient.put(
            new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
          );
        }
        esClientObj.putDocument(Github.Enums.IndexName.GitOrganization, formattedData);
      }
    }
    logger.info('getOrganizationDetails.successfull', {
      response: responseData?.data,
    });
    return responseData?.data?.login;
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
