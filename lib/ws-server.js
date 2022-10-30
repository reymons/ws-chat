const crypto = require("crypto");

class WebSockerServer {
  connections = new Set();
  #listeners = {};

  #HANDSHAKE_CONSTANT = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  #XOR_REMOVE_FIRST_BYTE_FOR_LENGTH = 128;
  #MASK_LENGTH = 4;

  #OPCODES = {
    TEXT: 129
  };

  #DATA_LENGTH = {
    SHORT: 125,
    MEDIUM: 126,
    LONG: 127
  };

  #DATA_OFFSET = {
    SHORT: 2,
    MEDIUM: 6,
    LONG: 10
  };

  #parser = {
    object: JSON.parse,
    string: v => v
  };

  constructor({ server, path }) {
    server.on("upgrade", (req, socket, head) => {
      if (req.headers.upgrade !== "websocket") return;
      if (req.url !== path) return;
      let key = req.headers["sec-websocket-key"];
      if (key === "" || key === undefined) return;
      key += this.#HANDSHAKE_CONSTANT;
      const sha1 = crypto.createHash("sha1");
      const hash = sha1.update(key).digest("base64");
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: upgrade\r\n" +
          `Sec-WebSocket-Accept: ${hash}\r\n` +
          "Sec-WebSocket-Protocol: chat\r\n" +
          "\r\n"
      );
      socket.send = data => this.send(data, socket);
      socket.on("error", () => this.#destroyConnection(socket));
      socket.on("close", () => this.#destroyConnection(socket));
      socket.on("data", frame => {
        if (this.#listeners.data === undefined) return;
        if (this.#listeners.data.size === 0) return;
        const result = this.#decryptFrame(frame);
        if (result === undefined) return;
        const data = this.#unmask(result.data, result.mask);
        this.#listeners.data.forEach(listener => listener(data, socket));
      });
      this.#emit("connection", socket);
      this.connections.add(socket);
    });
  }

  parse(data) {
    return this.#parser[typeof data](data);
  }

  #destroyConnection(socket) {
    this.connections.delete(socket);
    socket.destroy();
  }

  #decryptFrame(frame) {
    const length = frame[1] ^ this.#XOR_REMOVE_FIRST_BYTE_FOR_LENGTH;
    if (length <= this.#DATA_LENGTH.SHORT) {
      return {
        mask: frame.subarray(
          this.#DATA_OFFSET.SHORT,
          this.#DATA_OFFSET.SHORT + this.#MASK_LENGTH
        ),
        data: frame.subarray(this.#DATA_OFFSET.SHORT + this.#MASK_LENGTH)
      };
    }
    if (length === this.#DATA_LENGTH.MEDIUM) {
      return {
        mask: frame.subarray(
          this.#DATA_OFFSET.MEDIUM,
          this.#DATA_OFFSET.MEDIUM + this.#MASK_LENGTH
        ),
        data: frame.subarray(this.#DATA_OFFSET.MEDIUM + this.#MASK_LENGTH)
      };
    }
    if (length === this.#DATA_LENGTH.LONG) {
      return {
        mask: frame.subarray(
          this.#DATA_OFFSET.LONG,
          this.#MASK_LENGTH + this.#MASK_LENGTH
        ),
        data: frame.subarray(this.#DATA_OFFSET.LONG + this.#MASK_LENGTH)
      };
    }
  }

  #unmask(data, mask) {
    return Buffer.from(
      data.map((byte, i) => byte ^ mask[i % this.#MASK_LENGTH])
    );
  }

  sendToAll(data, config = {}) {
    const { exceptions } = config;
    this.connections.forEach(socket => {
      if (exceptions?.includes(socket)) return;
      const result = typeof data === "object" ? JSON.stringify(data) : data;
      this.send(result, socket);
    });
  }

  send(data, socket) {
    const meta = Buffer.alloc(2);
    meta[0] = this.#OPCODES.TEXT;
    meta[1] = data.length;
    if (meta[1] > this.#DATA_LENGTH.LONG) {
      meta[1] = this.#DATA_LENGTH.LONG;
    }
    socket.write(Buffer.concat([meta, Buffer.from(data)]));
  }

  on(event, listener) {
    if (this.#listeners[event] === undefined) {
      this.#listeners[event] = new Set();
    }
    this.#listeners[event].add(listener);
    return () => this.#listeners[event].delete(listener);
  }

  #emit(event, ...data) {
    if (this.#listeners[event] !== undefined) {
      this.#listeners[event].forEach(listener => listener(...data));
    }
  }
}

module.exports = { WebSockerServer };
