import { HttpStatusCode } from "../constant/httpStatusCode";
import { ResponseCodes } from "../constant/responseCode";
import { APIGatewayProxyResult } from "aws-lambda";

interface Header {
  [name: string]: string | number | boolean;
}

class ResponseParser {
  private statusCode: number;

  private resMessage: string;

  private resCode: string;

  private resBody: unknown;

  private resHeader: Header;

  constructor() {
    this.statusCode = HttpStatusCode[200];
    this.resMessage = "";
    this.resCode = ResponseCodes.SUCCESS;
    this.resBody = {};
    this.resHeader = { "Content-Type": "application/json" };
  }

  public setStatusCode(httpCode: number): this {
    this.statusCode = httpCode;
    return this;
  }

  public setMessage(message: string): this {
    this.resMessage = message;
    return this;
  }

  public setResponseBodyCode(code: string): this {
    this.resCode = code;
    return this;
  }

  public setBody<T>(body: T): this {
    this.resBody = body;
    return this;
  }

  public setResponseHeader(header: Header): this {
    this.resHeader = { ...header, ...this.resHeader };
    return this;
  }

  public send(): APIGatewayProxyResult {
    return {
      statusCode: this.statusCode,
      body: JSON.stringify({
        data: this.resBody,
        message: this.resMessage,
        code: this.resCode,
      }),
      headers: this.resHeader,
    };
  }
}

export default new ResponseParser();
