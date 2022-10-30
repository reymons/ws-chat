const form = document.querySelector(".form");
const textarea = form.querySelector(".form__textarea");
const preloader = document.querySelector(".preloader");
const chatElem = document.querySelector(".chat");
const messagesElem = chatElem.querySelector(".chat__messages");

const { width } = chatElem.getBoundingClientRect();
const { height } = form.getBoundingClientRect();
form.style.width = `${width}px`;
chatElem.style.paddingBottom = `${height}px`;

let ws = null;

function wrapInDoubleRAF(callback) {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function sendMessage(type, data = {}) {
  if (ws) ws.send(JSON.stringify({ type, ...data }));
}

function connectWs() {
  ws = new WebSocket("ws://localhost:7000/chat");

  ws.addEventListener("open", () => {
    preloader.style.display = "none";
    sendMessage("load");
  });

  ws.addEventListener("message", e => {
    const data = JSON.parse(e.data);
    if (data.type === "message") {
      addMessage({ text: data.text });
      scrollChat("to-bottom");
      return;
    }
    if (data.type === "load") {
      data.messages.forEach(message => addMessage(message));
    }
  });

  ws.addEventListener("close", e => {
    console.log(e);
    setTimeout(() => connectWs(), 1000);
  });
}

function addMessage({ text, isYours }) {
  let className = "chat__message message";
  if (isYours) className += " chat__message--yours message--yours";
  messagesElem.insertAdjacentHTML(
    "beforeend",
    `
    <div class="${className}">
      <p class="message__text">${text}</p>
    </div>
  `
  );
}

function scrollChat(mode) {
  if (mode === "to-bottom") {
    window.scrollTo({ top: window.innerHeight });
  }
}

connectWs();

textarea.addEventListener("keypress", e => {
  if (e.code !== "Enter" || e.shiftKey) return;
  e.preventDefault();
  const text = e.target.value;
  if (text.length === 0) return;
  e.target.value = "";
  sendMessage("message", { text });
  addMessage({ text, isYours: true });
  scrollChat("to-bottom");
});
