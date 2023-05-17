import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const {
  STAGE,
  DYNAMODB_LOCAL_URL,
  ELASTIC_MAX_RETRIES,
  ELASTIC_NODE,
  ELASTIC_REQUEST_TIMEOUT,
  region,
} = process.env;
