import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { S3 } from 'aws-sdk';
import { GetObjectRequest } from 'aws-sdk/clients/s3';
import { logger } from 'core';
import esb from 'elastic-builder';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../constant/config';
import { formatRepoSastData } from 'src/util/response-formatter';
import moment from 'moment';

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
      fileName: error.location,
      lineNumber: error.lineNo,
      codeSnippet: error.snippet,
      metadata: [
        {
          branch: data.branch,
          firstReportedOn: moment(data.createdAt).toISOString(),
          lastReportedOn: moment(data.createdAt).toISOString(),
          isResolved: false,
        },
      ],
    },
  }));
}

const getQuery = (repoId: string, orgId: string): object => {
  const matchQry = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.repoId', `${mappingPrefixes.repo}_${repoId}`),
          esb.termQuery('body.organizationId', `${mappingPrefixes.organization}_${orgId}`),
        ])
    )
    .size(10000)
    .toJSON();
  return matchQry;
};

export async function getSastDataFromES(
  repoId: string,
  orgId: string
): Promise<Github.Type.RepoSastErrors[]> {
  const matchQry = getQuery(repoId, orgId);
  const res = await esClientObj.search(Github.Enums.IndexName.GitRepoSastErrors, matchQry);
  const finalRes = await formatRepoSastData(res);
  return finalRes;
}

export async function storeSastErrorReportToES(
  data: Github.Type.RepoSastErrors[],
  errorCountData: Github.Type.RepoSastErrorCount,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  try {
    if (data.length > 0) {
      logger.info({ message: 'storeSastErrorReportToES.data', data: data.length, ...reqCtx });
      await Promise.all([
        esClientObj.bulkInsert(Github.Enums.IndexName.GitRepoSastErrors, data),
        // store error count
        esClientObj.putDocument(Github.Enums.IndexName.GitRepoSastErrorCount, errorCountData),
      ]);
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
