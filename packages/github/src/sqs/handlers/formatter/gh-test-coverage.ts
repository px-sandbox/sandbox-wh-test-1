import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import AWS from 'aws-sdk';

const s3 = new AWS.S3(); 

const getS3File = async (key : string) => {
    const params = {
      Bucket: `${process.env.SST_STAGE}-test-coverage-report`, 
      Key: key
    };
    console.log(key);
    const s3Object = await s3.getObject(params).promise();
    
    if (s3Object.Body) {
      return JSON.parse(s3Object.Body.toString('utf-8'));
    } else {
      throw new Error("S3 object body is undefined or empty");
    }
}


export async function handler(event: SQSEvent): Promise<void> {
     await Promise.all(
     event.Records.map(async (record: SQSRecord) => {
      try{
            const { organisationId, repoId, createdAt, key } = JSON.parse(record.body);
      
            console.log(`Received payload:`, { organisationId, repoId, createdAt, key });
            const s3Data = await getS3File(key);

            
            console.log('S3 Data:', s3Data);
            return {
              statusCode: 200,
              body: JSON.stringify({ message: "Processing successful" }),
            };
       }
       catch(error)
       {
         logger.error({
             message: 'gh_test_coverage.handler.error',
             error: `${error}`,
           });
       }
      }
    )
   )
 }
    
   
  