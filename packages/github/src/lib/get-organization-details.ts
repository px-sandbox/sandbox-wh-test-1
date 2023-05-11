import { organizationFormator } from '../util/organization-formatter';
import { RequestInterface } from '@octokit/types';
import { ddbDocClient, logger } from 'core';
import { IndexName } from '../abstraction/enum/es-index-names';
import { region } from 'src/constant/config';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

export async function getOrganizationDetails(
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
    let responseData;
    responseData = await octokit(`GET /orgs/${organizationName}`);
    if (responseData?.data) {
      const getParams = {
        TableName: Table.GithubMapping.tableName,
        Key: {
          IndexName: 'githubIdIndex',
          KeyConditionExpression: 'githubId = :githubId',
          ExpressionAttributeValues: {
            ':githubId': `gh_org_${responseData.data.id}`,
          },
        },
      };
      const ddbRes = await ddbDocClient(region as string).send(
        new GetCommand(getParams)
      );
      logger.info(ddbRes);
      const result = await organizationFormator(
        responseData.data,
        ddbRes.Item?.parentId
      );
      logger.info(result);
      // Todo: In next PRelastic search
      //   if (!record) {
      //     logger.info('---NEW_RECORD_FOUND---');
      //     await new DynamoDBClient().updateTable(result);
      //   }
      //   await ElasticSearchIndex.saveOrUpdateDocument(
      //     IndexName.GitOrganization,
      //     result
      //   );
    }
    logger.info('getOrganizationDetails.successfull', {
      response: responseData?.data,
    });
    return {
      name: responseData?.data?.name,
    };
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
