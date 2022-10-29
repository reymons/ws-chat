const crypto = require("crypto");

class WebSockerServer {
  #connections = new Set();
  #dataListener;

  #HANDSHAKE_CONSTANT = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  #XOR_REMOVE_FIRST_BYTE_FOR_LENGTH = 128;
  #MASK_LENGTH = 4;

  #OPCODES = {
    TEXT: 137
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
      socket.on("error", () => this.#endConnection(socket));
      socket.on("data", frame => {
        const result = this.#decryptFrame(frame);
        if (result === undefined) return;
        const unmasked = this.#unmask(result.data, result.mask);
        const _socket = { ...socket };
        _socket.data = JSON.parse(unmasked.toString("utf8"));
        this.#dataListener?.(_socket);
      });
      socket.writeData = data => this.#sendData(socket, data);
      this.#connections.add(socket);
    });
  }

  #endConnection(socket) {
    this.#connections.delete(socket);
    socket.end();
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

  #sendData(socket, message) {
    const meta = Buffer.alloc(2);
    meta[0] = this.#OPCODES.TEXT;
    meta[1] = message.length;
    if (meta[1] > this.#DATA_LENGTH.LONG) {
      meta[1] = this.#DATA_LENGTH.LONG;
    }
    return socket.write(Buffer.concat([meta, message]));
  }

  onData(listener) {
    this.#dataListener = listener;
  }
}

module.exports = { WebSockerServer };
