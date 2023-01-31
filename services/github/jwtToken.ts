import jwt from "jsonwebtoken";
import fs from "fs";
import { Config } from "@serverless-stack/node/config";

export const handler = async function getOauthCode() {
  let jwt_token;

  console.log(Config.GITHUB_APP_ID);
  try {
    const payload = {
      // issued at time, 60 seconds in the past to allow for clock drift
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) - 60 + 60 * 10,
      iss: Config.GITHUB_APP_ID,
    };

    const privateKey = Buffer.from(
      Config.GITHUB_APP_PRIVATE_KEY_PEM,
      "base64"
    ).toString("binary");

    jwt_token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 200,
    body: {
      token: jwt_token,
      type: "Bearer",
    },
  };
};
