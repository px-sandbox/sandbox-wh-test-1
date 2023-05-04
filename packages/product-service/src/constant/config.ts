import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const { region } = process.env;
