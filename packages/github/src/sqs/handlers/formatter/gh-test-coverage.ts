import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { fetchDataFromS3 } from '../../../util/test-coverage';
import { Github } from 'abstraction';

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
          const coverageObj = {
            organisationId,
            repoId,
            createdAt,
            forDate: createdAt.split('T')[0],
            statements: { ...data.total.statements },
            branches: { ...data.total.branches },
            functions: { ...data.total.functions },
            lines: { ...data.total.lines },
          };
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
