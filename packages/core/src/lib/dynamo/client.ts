import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
// import {
//   marshallOptions as MarshallOptions,
//   unmarshallOptions as UnMarshallOptions,
// } from "@aws-sdk/util-dynamodb";

const ddbClient = (region: string, endpoint: string) =>
  new DynamoDBClient({ region, endpoint });

// const defaultMarshallOptions = {
//   // Whether to automatically convert empty strings, blobs, and sets to `null`.
//   convertEmptyValues: false, // false, by default.
//   // Whether to remove undefined values while marshalling.
//   removeUndefinedValues: false, // false, by default.
//   // Whether to convert typeof object to map attribute.
//   convertClassInstanceToMap: false, // false, by default.
// };

// const defaultUnmarshallOptions = {
//   // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
//   wrapNumbers: false, // false, by default.
// };

// interface DocClient {
//   customMarshallOptions?: MarshallOptions;
//   customUnmarshallOptions?: UnMarshallOptions;
// }
// // Create the DynamoDB document client.
// const ddbDocClient = ({
//   customMarshallOptions,
//   customUnmarshallOptions,
// }: DocClient): DynamoDBDocumentClient => {
//   const marshallOptions = customMarshallOptions
//     ? { ...customMarshallOptions, ...defaultMarshallOptions }
//     : defaultMarshallOptions;
//   const unmarshallOptions = customUnmarshallOptions
//     ? { ...customUnmarshallOptions, ...defaultUnmarshallOptions }
//     : defaultUnmarshallOptions;
//   return DynamoDBDocumentClient.from(ddbClient, {
//     marshallOptions,
//     unmarshallOptions,
//   });
// };

export { ddbClient };
