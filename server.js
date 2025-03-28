const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Change to your frontend URL in production
  },
});

let rooms = {}; // Room data

io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  socket.on("create-room", () => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms[roomId] = { players: [socket.id] };
    socket.join(roomId);
    socket.emit("room-created", roomId);
    console.log(`Room ${roomId} created`);
  });

  socket.on("join-room", (roomId) => {
    if (rooms[roomId] && rooms[roomId].players.length < 2) {
      rooms[roomId].players.push(socket.id);
      socket.join(roomId);
      io.to(roomId).emit("player-joined", rooms[roomId].players);
      console.log(`Player ${socket.id} joined room ${roomId}`);

      if (rooms[roomId].players.length === 2) {
        io.to(roomId).emit("game-start", "Game is starting!");
      }
    } else {
      socket.emit("error", "Room full or not found");
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    for (let room in rooms) {
      rooms[room].players = rooms[room].players.filter((id) => id !== socket.id);
      if (rooms[room].players.length === 0) {
        delete rooms[room];
        console.log(`Room ${room} deleted`);
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("🏏 PvP Cricket Quiz Backend Running!");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
