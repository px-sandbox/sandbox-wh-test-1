import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode } from '../constant/http-status-code';
import { ResponseCodes } from '../constant/response-code';

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
    const [statusCode, resMessage, resCode, resBody, resHeader] = [
      HttpStatusCode[200],
      '',
      ResponseCodes.SUCCESS,
      {},
      { 'Content-Type': 'application/json' },
    ];
    this.statusCode = statusCode;
    this.resMessage = resMessage;
    this.resCode = resCode;
    this.resBody = resBody;
    this.resHeader = resHeader;
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

const responseParser = new ResponseParser();
export { responseParser };
