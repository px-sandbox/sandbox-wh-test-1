import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Github } from 'abstraction';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { mappingPrefixes } from '../../../constant/config';
import { generateUuid } from '../../../util/response-formatter';
import { fetchDataFromS3 } from '../../../util/test-coverage';

const esClientObj = ElasticSearchClient.getInstance();

async function deleteCoverageData(id: string): Promise<void> {
  try {
    const query = esb.requestBodySearch().query(esb.boolQuery().must(esb.termQuery('body.id', id)));
    await esClientObj.deleteByQuery(Github.Enums.IndexName.GitTestCoverage, query.toJSON());
  } catch (error) {
    logger.error({
      message: 'gh_test_coverage.handler.error',
      error: `${error}`,
    });
  }
}
async function saveCoverageData(coverageObj: Github.Type.TestCoverageData): Promise<void> {
  try {
    await esClientObj.putDocument(Github.Enums.IndexName.GitTestCoverage, coverageObj);
  } catch (error) {
    logger.error({
      message: 'gh_test_coverage.handler.error',
      error: `${error}`,
    });
  }
}
export async function handler(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const {
          reqCtx: { requestId, resourceId },
          message: { organisationId, repoId, createdAt, s3ObjKey },
        } = JSON.parse(record.body);

        logger.info({
          message: 'testCoverage.received',
          data: JSON.parse(record.body),
          requestId,
        });

        const bucketName = `${process.env.SST_STAGE}-test-coverage-report`;

        const data: Github.Type.TestCoverage = await fetchDataFromS3(s3ObjKey, bucketName, {
          requestId,
          resourceId,
        });
        if (!data) {
          logger.error({
            message: 'ghTestCoverage.nodata',
            error: 'No data received from s3 ',
            requestId,
            resourceId,
          });
        } else {
          const createdDate = createdAt.split('T')[0];
          const { organization, repo } = mappingPrefixes;
          const coverageId = `${organization}_${organisationId}_${repo}_${repoId}_${createdDate}`;
          await deleteCoverageData(coverageId);
          const coverageObj = {
            id: generateUuid(),
            body: {
              id: coverageId,
              organisationId: `${mappingPrefixes.organization}_${organisationId}`,
              repoId: `${mappingPrefixes.repo}_${repoId}`,
              createdAt,
              forDate: createdDate,
              statements: { ...data.coverage.total.statements },
              branches: { ...data.coverage.total.branches },
              functions: { ...data.coverage.total.functions },
              lines: { ...data.coverage.total.lines },
              cron: false,
            },
          };
          await saveCoverageData(coverageObj);
        }
      } catch (error) {
        logger.error({
          message: 'gh_test_coverage.handler.error',
          error: `${error}`,
        });
      }
    })
  );
}
