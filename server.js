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

// In-memory store for active rooms
let rooms = {};

// Generate unique Room ID
const generateRoomId = () => Math.random().toString(36).substring(2, 8);

// API: Health Check
app.get("/", (req, res) => {
  res.send("🏏 PvP Cricket Quiz Backend is Live!");
});

// API: Create Room
app.post("/createroom", (req, res) => {
  const { playerName } = req.body;
  const roomId = generateRoomId();

  rooms[roomId] = {
    players: [{ id: "host", name: playerName, runs: 0, wickets: 0 }],
    scores: {},
  };

  console.log(`🎯 Room Created: ${roomId} by ${playerName}`);
  res.status(200).json({ roomId });
});

// Socket Handling
io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  // Player joins a room
  socket.on("joinRoom", ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      socket.emit("error", { message: "Room does not exist!" });
      return;
    }

    // Prevent duplicate host
    if (rooms[roomId].players.find((p) => p.id === socket.id)) return;

    rooms[roomId].players.push({
      id: socket.id,
      name: playerName,
      runs: 0,
      wickets: 0,
    });
    socket.join(roomId);

    console.log(`👥 ${playerName} (${socket.id}) joined Room ${roomId}`);
    io.to(roomId).emit("playersUpdate", rooms[roomId].players);
  });

  // Host starts game
  socket.on("startGame", ({ roomId }) => {
    if (rooms[roomId] && rooms[roomId].players.length >= 2) {
      console.log(`🏁 Game Started in Room ${roomId}`);
      io.to(roomId).emit("startQuiz");
    } else {
      socket.emit("error", { message: "At least 2 players required to start." });
    }
  });

  // Send quiz questions
  socket.on("sendQuestions", ({ roomId, questions }) => {
    if (rooms[roomId]) {
      console.log(`📩 Questions sent for Room ${roomId}`);
      io.to(roomId).emit("quizQuestions", questions);
    }
  });

  // Player submits an answer
  socket.on("submitAnswer", ({ roomId, playerId, answer }) => {
    console.log(`✅ Player ${playerId} answered ${answer} in Room ${roomId}`);
    io.to(roomId).emit("answerReceived", { playerId, answer });
  });

  // Update player's score
  socket.on("updateScore", ({ roomId, playerId, runs, wickets }) => {
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find((p) => p.id === playerId);
      if (player) {
        player.runs += runs;
        player.wickets += wickets;
        console.log(
          `🔢 Score Updated: ${player.name} -> Runs: ${player.runs}, Wickets: ${player.wickets}`
        );
      }
      io.to(roomId).emit("playersUpdate", rooms[roomId].players);
    }
  });

  // End game
  socket.on("endGame", ({ roomId }) => {
    if (rooms[roomId]) {
      console.log(`🏆 Game Over in Room ${roomId}`);
      io.to(roomId).emit("showLeaderboard", rooms[roomId].players);
      delete rooms[roomId];
    }
  });

  // Handle player disconnect
  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);

    for (const roomId in rooms) {
      const room = rooms[roomId];
      const updatedPlayers = room.players.filter((p) => p.id !== socket.id);

      if (updatedPlayers.length === 0) {
        delete rooms[roomId];
        console.log(`🗑️ Room ${roomId} deleted (empty)`);
      } else {
        room.players = updatedPlayers;
        io.to(roomId).emit("playersUpdate", room.players);
      }
    }
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
