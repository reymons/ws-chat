import http from "http";
import net from "net";

interface Config {
  server: http.Server;
  path: string;
}

interface ModifiedSocket extends net.Socket {
  writeData(data: Buffer): boolean;
  data: object | string;
}

class WebSockerServer {
  constructor(config: Config): this;
  onData(callback: (socket: ModifiedSocket) => void): void;
}
