import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { S3 } from 'aws-sdk';
import { GetObjectRequest } from 'aws-sdk/clients/s3';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';

const esClientObj = ElasticSearchClient.getInstance();
export async function repoSastErrorsFormatter(
  data: Github.ExternalType.Api.RepoSastErrors
): Promise<Github.Type.RepoSastErrors[]> {
  return data.errors.map((error) => ({
    _id: uuid(),
    body: {
      errorMsg: error.message,
      ruleId: error.ruleId,
      repoId: `${mappingPrefixes.repo}_${data.repoId}`,
      organizationId: `${mappingPrefixes.organization}_${data.orgId}`,
      branch: data.branch,
      fileName: error.location,
      lineNumber: error.lineNo,
      codeSnippet: error.snippet,
      date: data.date,
      createdAt: data.createdAt,
      isDeleted: false,
    },
  }));
}

const getQuery = (repoId: string, branch: string, orgId: string, createdAt: string): object => {
  const matchQry = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.repoId', `${mappingPrefixes.repo}_${repoId}`),
          esb.termQuery('body.branch', branch),
          esb.termQuery('body.organizationId', `${mappingPrefixes.organization}_${orgId}`),
          esb
            .rangeQuery('body.createdAt')
            .gt(moment().utc().startOf('day').toISOString())
            .lt(createdAt),
          esb.termQuery('body.isDeleted', false),
        ])
    )

    .toJSON();
  return matchQry;
};
export async function storeSastErrorReportToES(
  data: Github.Type.RepoSastErrors[],
  repoId: string,
  branch: string,
  orgId: string,
  createdAt: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  try {
    const matchQry = getQuery(repoId, branch, orgId, createdAt);
    const script = esb.script('inline', 'ctx._source.body.isDeleted = true');
    await esClientObj.updateByQuery(
      Github.Enums.IndexName.GitRepoSastErrors,
      matchQry,
      script.toJSON()
    );

    if (data.length > 0) {
      logger.info({ message: 'storeSastErrorReportToES.data', data: data.length, ...reqCtx });
      await esClientObj.bulkInsert(Github.Enums.IndexName.GitRepoSastErrors, data);
      logger.info({ message: 'storeSastErrorReportToES.success', ...reqCtx });
    } else {
      logger.info({ message: 'storeSastErrorReportToES.no_data', ...reqCtx });
    }
  } catch (error) {
    logger.error({ message: 'storeSastErrorReportToES.error', error, ...reqCtx });
    throw error;
  }
}
export async function fetchDataFromS3<T>(
  key: string,
  bucketName: string,
  reqCtx: Other.Type.RequestCtx
): Promise<T> {
  const params: GetObjectRequest = {
    Bucket: `${bucketName}`,
    Key: key,
    ResponseContentType: 'application/json',
  };
  logger.info({ message: 'fetchDataFromS3.params', data: { params }, ...reqCtx });
  const s3 = new S3();
  try {
    const data = await s3.getObject(params).promise();
    const jsonData = JSON.parse(data.Body?.toString() || '{}');
    return jsonData;
  } catch (error) {
    logger.error({ message: 'fetchDataFromS3.error', error, ...reqCtx });
    throw error;
  }
}
