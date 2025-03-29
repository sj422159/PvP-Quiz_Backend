const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let rooms = {};

// Generate Random Room ID
const generateRoomId = () => Math.random().toString(36).substring(2, 8);

// Create Room API
app.post("/createroom", (req, res) => {
  const roomId = generateRoomId();
  rooms[roomId] = { players: [], scores: {} };
  console.log("🎯 Room created:", roomId);
  res.status(200).json({ roomId });
});

// Room Info API (Optional, for debugging)
app.get("/roominfo/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  if (rooms[roomId]) {
    res.status(200).json({
      players: rooms[roomId].players,
      count: rooms[roomId].players.length,
    });
  } else {
    res.status(404).json({ message: "Room not found" });
  }
});

// Health Check
app.get("/", (req, res) => {
  res.send("🏏 PvP Cricket Quiz Backend Running!");
});

// Socket Handling
io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  // Join Room
  socket.on("joinRoom", ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      socket.emit("error", { message: "Room does not exist!" });
      return;
    }

    // Avoid duplicate joins
    if (!rooms[roomId].players.find((p) => p.id === socket.id)) {
      rooms[roomId].players.push({
        id: socket.id,
        name: playerName,
        runs: 0,
        wickets: 0,
      });
    }

    socket.join(roomId);

    console.log(`👥 Player ${playerName} (${socket.id}) joined room ${roomId}`);

    // Notify all players
    io.to(roomId).emit("playersUpdate", rooms[roomId].players);
    io.to(roomId).emit("playerCount", rooms[roomId].players.length);
  });

  // Start Game
  socket.on("startGame", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId].players.length >= 2) {
      console.log(`🏁 Game started in room ${roomId}`);
      io.to(roomId).emit("startQuiz");
    } else {
      socket.emit("error", { message: "Not enough players to start the game." });
    }
  });

  // Send Questions
  socket.on("sendQuestions", ({ roomId, questions }) => {
    if (rooms[roomId]) {
      console.log(`📩 Questions sent for room ${roomId}`);
      io.to(roomId).emit("quizQuestions", questions);
    }
  });

  // Handle Answer Submission
  socket.on("submitAnswer", ({ roomId, playerId, answer }) => {
    console.log(`✅ Player ${playerId} submitted answer ${answer} in room ${roomId}`);
    io.to(roomId).emit("answerReceived", { playerId, answer });
  });

  // Update Score
  socket.on("updateScore", ({ roomId, playerId, runs, wickets }) => {
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find((p) => p.id === playerId);
      if (player) {
        player.runs += runs;
        player.wickets += wickets;
        console.log(`🔢 Updated score: ${playerId} -> Runs: ${player.runs}, Wickets: ${player.wickets}`);
      }
      io.to(roomId).emit("playersUpdate", rooms[roomId].players);
    }
  });

  // End Game
  socket.on("endGame", ({ roomId }) => {
    if (rooms[roomId]) {
      console.log(`🏆 Game over in room ${roomId}`);
      io.to(roomId).emit("showLeaderboard", rooms[roomId].players);
      delete rooms[roomId];
    }
  });

  // Handle Disconnect
  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex((p) => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(roomId).emit("playersUpdate", room.players);
        io.to(roomId).emit("playerCount", room.players.length);
        console.log(`🚪 Player removed from room ${roomId}. Remaining: ${room.players.length}`);
        if (room.players.length === 0) {
          delete rooms[roomId];
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
      }
    }
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
