import jwt from "jsonwebtoken";
import fs from "fs";

export const handler = async function getOauthCode() {
  let jwt_token;
  try {
    const payload = {
      // issued at time, 60 seconds in the past to allow for clock drift
      iat: Math.floor(Date.now() / 1000) - 60,
      exp: Math.floor(Date.now() / 1000) - 60 + 60 * 10,
      iss: 283483,
    };

    const privateKey = fs.readFileSync(
      "/Users/meetamaity/Desktop/test-github-app.pem"
    );
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
