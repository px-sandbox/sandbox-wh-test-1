// Import required AWS SDK clients and commands for Node.js
import { CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { ddbClient } from "@my-sst-app/core/lib/dynamo/client";
import { region, dynamo_endpoint } from "./../constant/config";

// Set the parameters
export const params = {
  AttributeDefinitions: [
    {
      AttributeName: "email",
      AttributeType: "S",
    },
    {
      AttributeName: "first_name",
      AttributeType: "S",
    },
    {
      AttributeName: "last_name",
      AttributeType: "S",
    },
    {
      AttributeName: "password",
      AttributeType: "S",
    },
  ],
  KeySchema: [
    {
      AttributeName: "email",
      KeyType: "HASH",
    },
  ],
  TableName: "users", //TABLE_NAME
  StreamSpecification: {
    StreamEnabled: false,
  },
};

export const run = async () => {
  try {
    const dynamoClient = ddbClient(region as string, dynamo_endpoint as string);
    const data = await dynamoClient.send(new CreateTableCommand(params));
    console.log("Table Created", data);
    return data;
  } catch (err) {
    console.log("Error", err);
  }
};
run();
