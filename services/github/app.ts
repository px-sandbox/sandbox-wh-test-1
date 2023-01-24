import logger from "../../utils/logger";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
// import fs from "fs";
import jwt from "jsonwebtoken";
import fs from "fs";
import { Response } from "aws-sdk";

export const handler = async function getApp(event: APIGatewayProxyEvent) {
  const token: string = event.headers["authorization"]?.split(" ")[1] || "";
  let response_data;
  try {
    const response = await axios({
      method: "get",
      url: "https://api.github.com/app",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
      },
    }).then(function (response) {
      console.log("meeta1234:" + response.data);
      response_data = response.data;
    });
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 200,
    body: response_data,
  };
};
