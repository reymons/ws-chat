import http from "http";

interface ModifiedServerResponse extends http.ServerResponse {
  status(code: number): http.ServerResponse;
  endWithError(message: string): void;
}

type RequestListener = (
  req: http.IncomingMessage,
  res: ModifiedServerResponse
) => void;

class Server extends http.Server {
  ERRORS = {
    CODE: {
      405: string
    },
    DEFAULT: string
  };

  MIME_TYPE = {
    html: string,
    css: string,
    js: string
  };

  constructor(conf: { port: string; dist: string }): Server;

  /**
   * @description
   * only one handler at the same time allowed
   */
  onRequest(listener: RequestListener): void;

  /**
   * @description Starts the server
   */
  start(): void;

  PORT: string;
  DIST: string;
}

export { Server };
