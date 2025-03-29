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

let rooms = {};

// Generate Room ID
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8);
};

// Gemini API Call (Optional)
const fetchQuestionFromGemini = async () => {
  try {
    const response = await axios.post(
      "https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/YOUR_MODEL_ID:predict",
      {
        instances: [
          {
            prompt: "Give me a cricket quiz question with options and the correct answer.",
            temperature: 0.7,
            max_output_tokens: 150,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer YOUR_API_KEY`,
        },
      }
    );

    if (response.data?.predictions?.[0]) {
      return response.data.predictions[0].text.trim();
    } else {
      return "Failed to fetch question";
    }
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    return "Error fetching question";
  }
};

// Room Creation
app.post("/createroom", (req, res) => {
  const roomId = generateRoomId();
  rooms[roomId] = {
    players: [],
    questions: [], // questions will be stored here
    scores: {},
    gameStarted: false,
  };
  console.log(`🎯 Room created: ${roomId}`);
  res.status(200).json({ roomId });
});

// Health Check
app.get("/", (req, res) => {
  res.send("🏏 PvP Cricket Quiz Backend Running!");
});

// Socket Handling
io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  socket.on("joinRoom", ({ roomId, playerName }) => {
    if (rooms[roomId]) {
      rooms[roomId].players.push({ id: socket.id, name: playerName });
      rooms[roomId].scores[socket.id] = { runs: 0, wickets: 0 };

      socket.join(roomId);
      console.log(`👥 Player ${playerName} (${socket.id}) joined room ${roomId}`);

      // Notify players
      io.to(roomId).emit("players", rooms[roomId].players);

      // Auto start when 2 players joined
      if (rooms[roomId].players.length === 2 && !rooms[roomId].gameStarted) {
        startGame(roomId);
      }
    }
  });

  socket.on("submitScore", ({ roomId, runs, wickets }) => {
    if (rooms[roomId] && rooms[roomId].scores[socket.id]) {
      rooms[roomId].scores[socket.id] = { runs, wickets };
      console.log(`🏏 Score Updated: ${socket.id} → ${runs} runs, ${wickets} wickets`);

      // If all players submitted scores → send leaderboard
      const allSubmitted = Object.values(rooms[roomId].scores).every(
        (score) => score.runs !== 0 || score.wickets !== 0
      );

      if (allSubmitted) {
        const leaderboard = rooms[roomId].players.map((p) => ({
          name: p.name,
          ...rooms[roomId].scores[p.id],
        }));
        io.to(roomId).emit("showLeaderboard", leaderboard);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter((p) => p.id !== socket.id);
      delete rooms[roomId].scores[socket.id];
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
        console.log(`🗑️ Room ${roomId} deleted`);
      }
    }
  });
});

// Game Starter Function
const startGame = (roomId) => {
  console.log(`🔥 Starting Game in Room ${roomId}`);
  const staticQuestions = [
    {
      question: "Who won the ICC Cricket World Cup in 2019?",
      options: ["India", "Australia", "England", "New Zealand"],
      answer: "England",
    },
    {
      question: "Which cricketer is known as the 'God of Cricket'?",
      options: ["Virat Kohli", "Sachin Tendulkar", "MS Dhoni", "Ricky Ponting"],
      answer: "Sachin Tendulkar",
    },
    {
      question: "How many players are there in a cricket team?",
      options: ["9", "10", "11", "12"],
      answer: "11",
    },
  ];

  rooms[roomId].questions = staticQuestions;
  rooms[roomId].gameStarted = true;

  // Emit Questions to both players
  io.to(roomId).emit("startQuiz", { questions: staticQuestions });
};

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
