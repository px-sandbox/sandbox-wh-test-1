import { Stack } from 'aws-cdk-lib';
import { Function, Queue, Bucket, use } from 'sst/constructs';

export function createGhTestCoverageQueue(
    stack: Stack,
    testCoverageReportsBucket: Bucket
): Queue[]{  

    const testCoverageQueue = new Queue(stack, "qGhTestCoverage");
 
    testCoverageQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhTestCoverage', {
            handler: 'packages/github/src/sqs/handlers/formatter/gh-test-coverage.handler',
            bind: [testCoverageQueue, testCoverageReportsBucket]
        }),

        cdk:{
         eventSource: {
             batchSize: 1
           }
        }
    })


   return [testCoverageQueue];
}
   
