import { createLogger, format, transports, add } from "winston";
import WinstonCloudWatch from "winston-cloudwatch";
// const { combine, timestamp, label, prettyPrint } = format;
const AWS = require("aws-sdk");

AWS.config.update({
  region: "eu-west-1",
});

const logger = createLogger({
  format: format.json(),
  transports: [
    new transports.Console(),
    // new WinstonCloudWatch({
    //   logGroupName: "rest-api-ts-logs",
    //   logStreamName: "rest-api-ts-logs-test",
    //   awsRegion: "eu-west-1",
    //   messageFormatter: ({ level, message }) => `[${level}] : ${message}`,
    // }),
  ],
});

add(
  new WinstonCloudWatch({
    cloudWatchLogs: new AWS.CloudWatchLogs(),
    logGroupName: "rest-api-ts-logs",
    logStreamName: "rest-api-ts-logs-test",
  })
);

logger.log({
  level: "error",
  message: "local-error log of /notes api",
});

export default logger;

// logger.add(
//   new WinstonCloudWatch({
//     logGroupName: "rest-api-ts-logs",
//     logStreamName: "rest-api-ts-logs-test",
//     // createLogGroup: true,
//     // createLogStream: true,
//     awsAccessKeyId: "ASIASHLIFCOKYVJR6QXZ",
//     awsSecretKey: "nK3uTyt10ltpojVDhKPg3yaPR0KsjlQi1CKaTuy7",
//     awsRegion: "eu-west-1",
//     messageFormatter: ({ level, message, additionalInfo }) =>
//       `[${level}] : ${message} \nAdditional Info: ${JSON.stringify(
//         additionalInfo
//       )}}`,
//   })
// );
