import { createLogger, format, transports } from 'winston';

const AWS = require('aws-sdk');

AWS.config.update({
  region: 'eu-west-1',
});

const logger = createLogger({
  format: format.json(),
  transports: [new transports.Console()],
});

export default logger;
