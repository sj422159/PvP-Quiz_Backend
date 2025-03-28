const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Update with frontend URL in prod
  },
});

let players = [];

io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);
  players.push(socket.id);

  // Send updated players list to everyone
  io.emit("players", players);

  socket.on("startGame", () => {
    io.emit("startGame");
    console.log("🔥 Game Started by", socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    players = players.filter((id) => id !== socket.id);
    io.emit("players", players);
  });
});

app.get("/", (req, res) => {
  res.send("🏏 PvP Cricket Quiz Backend Running!");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
