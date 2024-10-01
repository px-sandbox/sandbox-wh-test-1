import { Other } from 'abstraction';
import { GetObjectRequest } from 'aws-sdk/clients/s3';
import { logger } from 'core';
import { S3 } from 'aws-sdk';

const s3 = new S3();
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

  try {
    const data = await s3.getObject(params).promise();
    const jsonData = JSON.parse(data.Body?.toString() || '{}');
    return jsonData;
  } catch (error) {
    logger.error({ message: 'fetchDataFromS3.error', error, ...reqCtx });
    throw error;
  }
}
