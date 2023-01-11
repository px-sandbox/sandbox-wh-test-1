import { APIGatewayProxyResult } from "aws-lambda";
import notes from "./notes";

export async function handler(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify(notes, null, "  "),
  };
}
