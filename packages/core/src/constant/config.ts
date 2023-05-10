import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const { STAGE, DYNAMODB_LOCAL_URL } = process.env;
