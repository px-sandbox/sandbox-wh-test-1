import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const { region, GIT_ORGANIZATION_ID } = process.env;
