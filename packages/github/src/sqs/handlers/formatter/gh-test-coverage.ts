import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import AWS from 'aws-sdk';
import {fetchDataFromS3} from "../../../util/test-coverage"



export async function handler(event: SQSEvent): Promise<void> {
     await Promise.all(
     event.Records.map(async (record: SQSRecord) => {
      try{
        logger.info(
          {
            message:JSON.parse(record.body)
          }
        );
            const { 
              reqCtx: { requestId, resourceId },
              message:{organisationId, repoId, createdAt, s3ObjKey }} = JSON.parse(record.body);

            const bucketName= `${process.env.SST_STAGE}-test-coverage-report`
             
            const data = await fetchDataFromS3(s3ObjKey, bucketName, {
              requestId,
              resourceId,
            });

            if(!data){
              logger.error({
                message: 'ghTestCoverage.nodata',
                error: 'No data received from s3 ',
                requestId,
                resourceId,
              });
            }
            else{
              console.log(data);
            }
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
    
   
  