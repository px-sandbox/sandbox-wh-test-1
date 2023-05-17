import { Client } from '@elastic/elasticsearch';
import {
	ELASTIC_MAX_RETRIES,
	ELASTIC_NODE,
	ELASTIC_REQUEST_TIMEOUT,
} from '../../constant/config';

const client = new Client({
	node: ELASTIC_NODE,
	maxRetries: Number(ELASTIC_MAX_RETRIES),
	requestTimeout: Number(ELASTIC_REQUEST_TIMEOUT),
	// sniffOnStart: true,
});
export default client;
