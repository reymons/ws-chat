const { Server } = require("./server");
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");
const { pipeline } = require("stream");
const { WebSockerServer } = require("./ws-server");

const server = new Server({
  port: 7000,
  dist: path.resolve(__dirname, "../static")
});

const wsServer = new WebSockerServer({ server, path: "/chat" });

/* GET-requests only */

server.onRequest((req, res) => {
  if (req.method !== "GET") {
    res.status(405);
    res.endWithError(server.ERRORS.CODE[405]);
    return;
  }

  const pathname = req.url === "/" ? "/index.html" : req.url;
  const ext = path.extname(pathname);
  const type = server.MIME_TYPE[ext.slice(1)];

  if (type === undefined) {
    return res.status(404).end();
  }

  res.writeHead(200, {
    "Content-Type": type,
    "Content-Encoding": "br"
  });

  const filename = path.join(server.DIST, pathname);
  const rs = fs.createReadStream(filename);
  const bs = zlib.createBrotliCompress();

  pipeline(rs, bs, res, () => res.status(500).end());
});

wsServer.onData(socket => {
  console.log(socket.data);
});

server.on("error", error => console.log(error.message));
server.start();
