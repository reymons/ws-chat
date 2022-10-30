import http from "http";
import net from "net";

interface Config {
  server: http.Server;
  path: string;
}

type Data = Buffer | string;

interface ModifiedSocket extends net.Socket {
  send(data: Data): void;
}

type Event = {
  connection: (socket: ModifiedSocket) => void;
  data: (data: Buffer, socket: ModifiedSocket) => void;
};

class WebSockerServer {
  constructor(config: Config): this;
  on<E extends keyof Event>(event: E, listener: Event[E]): void;
  send(data: Data, socket: ModifiedSocket): void;
  sendToAll(
    data: Data | object,
    config?: {
      exceptions: ModifiedSocket[];
    }
  ): void;
  connections: Set<ModifiedSocket>;
  parse(data: object | string): object | string;
}
