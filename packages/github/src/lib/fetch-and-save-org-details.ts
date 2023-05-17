import { organizationFormator } from '../util/organization-formatter';
import { RequestInterface } from '@octokit/types';
import { ElasticClient, ddbDocClient, find, logger, updateTable } from 'core';
import { region } from 'src/constant/config';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';
import { Github } from 'abstraction';
import { ddbGlobalIndex } from 'abstraction/other/type';

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
    let responseData;
    responseData = await octokit(`GET /orgs/${organizationName}`);
    if (responseData?.data) {
      const record = await find(`gh_user_${responseData.data.id}`);
      const result = await organizationFormator(
        responseData.data,
        record?.parentId
      );
      if (!record) {
        logger.info('---NEW_RECORD_FOUND---');

        await updateTable(result);
      }
      await ElasticClient.saveOrUpdateDocument(
        Github.Enums.IndexName.GitOrganization,
        result
      );
    }
    logger.info('getOrganizationDetails.successfull', {
      response: responseData?.data,
    });
    return {
      name: responseData?.data?.login,
    };
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
