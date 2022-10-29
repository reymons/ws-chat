const http = require("http");
const path = require("path");

class Server extends http.Server {
  MIME_TYPE = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript"
  };

  ERRORS = {
    CODE: {
      405: "This method is not supported"
    },
    DEFAULT: "Some error has occurred"
  };

  #requestListener;

  constructor({ port, dist }) {
    super((req, res) => {
      res.status = code => {
        res.statusCode = code;
        return res;
      };
      res.endWithError = message => {
        res.end(JSON.stringify({ error: { message } }));
      };
      this.#requestListener(req, res);
    });

    this.PORT = port;
    this.DIST = dist;
  }

  onRequest(listener) {
    this.#requestListener = listener;
  }

  start() {
    this.listen(this.PORT, () => {
      console.log(`Serving on port ${this.PORT}`);
    });
  }
}

module.exports = { Server };
