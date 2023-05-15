export interface JWTResponse {
  statusCode: number;
  body: {
    token: string | null;
    type: string;
    expiry: string | null;
  };
}
