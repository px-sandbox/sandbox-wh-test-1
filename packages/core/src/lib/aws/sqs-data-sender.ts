import AWS from 'aws-sdk';
import { Queue } from 'sst/node/queue';
import { HttpStatusCode } from '../../constant';

const sqs = new AWS.SQS();

export async function sqsDataSender(data: any): Promise<any> {
	// Send a message to queue
	await sqs
		.sendMessage({
			// Get the queue url from the environment variable
			QueueUrl: Queue.Queue.queueUrl,
			MessageBody: JSON.stringify(data),
		})
		.promise();

	// console.log("Message queued!");

	return {
		statusCode: HttpStatusCode[200],
		body: JSON.stringify({ status: 'successful' }),
	};
}
