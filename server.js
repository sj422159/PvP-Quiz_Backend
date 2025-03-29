const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let players = [];
let currentQuestion = "";
let rooms = {};

// 🔥 Random Room ID Generator
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8); // e.g. "x9j7k2"
};

// ✅ Google Gemini API Call
const fetchQuestionFromGemini = async () => {
  try {
    console.log("🚀 Calling Google Gemini API...");

    const response = await axios.post(
      "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/YOUR_MODEL_ID:predict",
      {
        instances: [{
          prompt: "Give me a cricket quiz question with options and the correct answer.",
          temperature: 0.7,
          max_output_tokens: 150,
        }],
      },
      {
        headers: {
          Authorization: `Bearer AIzaSyBXJoaREJtOGZNjJ8GQUpCIja0zmPUBxBM`,
        },
      }
    );

    if (response.data && response.data.predictions && response.data.predictions[0]) {
      currentQuestion = response.data.predictions[0].text.trim();
      console.log("✅ Question fetched:", currentQuestion);
      return currentQuestion;
    } else {
      console.error("❌ Invalid response:", response.data);
      return "Failed to fetch question";
    }
  } catch (error) {
    console.error("❌ Gemini API Error:", error.response?.data || error.message);
    return "Error fetching question";
  }
};

// ✅ Create Room API
app.post("/createroom", (req, res) => {
  const roomId = generateRoomId();
  rooms[roomId] = {
    players: [],
  };
  console.log("🎯 Room created:", roomId);
  res.status(200).json({ roomId });
});

// ✅ Basic Health Route
app.get("/", (req, res) => {
  res.send("🏏 PvP Cricket Quiz Backend Running!");
});

// ✅ Socket Handling
io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);
  players.push(socket.id);
  io.emit("players", players);

  // Join Room
  socket.on("joinRoom", ({ roomId }) => {
    if (rooms[roomId]) {
      rooms[roomId].players.push(socket.id);
      socket.join(roomId);
      console.log(`👥 Player ${socket.id} joined room ${roomId}`);

      // Start quiz when 2 players join
      if (rooms[roomId].players.length === 2) {
        io.to(roomId).emit("startQuiz", { roomId });
      }
    }
  });

  // Start Game
  socket.on("startGame", async ({ roomId }) => {
    console.log(`🔥 Game started by ${socket.id} in room ${roomId}`);
    const question = await fetchQuestionFromGemini();
    io.to(roomId).emit("new-question", question);

    // Optional auto-question every 10s
    // setInterval(async () => {
    //   const question = await fetchQuestionFromGemini();
    //   io.to(roomId).emit("new-question", question);
    // }, 10000);
  });

  // Player Disconnect
  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    players = players.filter((id) => id !== socket.id);
    io.emit("players", players);

    // Remove from room
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter((id) => id !== socket.id);
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
        console.log(`🗑️ Room ${roomId} deleted`);
      }
    }
  });
});

// ✅ Server Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
